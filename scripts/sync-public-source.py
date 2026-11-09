#!/usr/bin/env python3
"""Export a sanitized, tracked-source snapshot into a public Git checkout.

This tool deliberately only prepares the target worktree.  It does not commit,
push, or execute anything from the source snapshot.
"""

from __future__ import annotations

import argparse
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import sys
import tarfile
from typing import Iterable, List, Optional, Sequence, Tuple
from urllib.parse import urlparse


SOURCE_REPOSITORY = "Chessticize/v0-chessticize"
PROVENANCE_FILE = "PUBLIC_SOURCE.json"
_SHA_RE = re.compile(r"^[0-9a-fA-F]{40,64}$")

# These names are removed wherever they appear in an archive path.  The list is
# intentionally directory-oriented: source and build *configuration* files are
# retained, while generated dependency/build outputs are not published.
_EXCLUDED_DIRECTORIES = frozenset(
    {
        ".agents",
        ".augment",
        ".cache",
        ".claude",
        ".codex",
        ".cursor",
        ".git",
        ".github",
        ".mypy_cache",
        ".next",
        ".pytest_cache",
        ".pnpm-store",
        ".scratch",
        ".vercel",
        ".codex-worktrees",
        "emulator-data",
        "firebaseauth_export",
        "firestore_export",
        ".ruff_cache",
        ".turbo",
        ".venv",
        ".windsurf",
        "__pycache__",
        "build",
        "coverage",
        "dist",
        "node_modules",
        "out",
        "venv",
    }
)
_EXCLUDED_FILES = frozenset(
    {"AGENT.md", "AGENTS.md", "CLAUDE.md", "GEMINI.md", ".DS_Store"}
)


class SnapshotError(RuntimeError):
    """The requested snapshot cannot safely be prepared."""


def _run_git(directory: Path, arguments: Sequence[str], *, text: bool = True):
    try:
        return subprocess.run(
            ["git", "-C", os.fspath(directory), *arguments],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=text,
        )
    except FileNotFoundError as error:
        raise SnapshotError("git is required to prepare a public snapshot") from error
    except subprocess.CalledProcessError as error:
        detail = error.stderr.strip() if isinstance(error.stderr, str) else ""
        raise SnapshotError(detail or "git could not read the supplied repository") from error


def _repository_root(directory: Path, label: str) -> Path:
    if not directory.is_dir():
        raise SnapshotError("{} must be an existing directory".format(label))
    root = _run_git(directory, ["rev-parse", "--show-toplevel"]).stdout.strip()
    if not root:
        raise SnapshotError("{} must be a checked-out Git repository".format(label))
    return Path(root).resolve()


def _is_root(path: Path) -> bool:
    return path == Path(path.anchor)


def _is_within(child: Path, parent: Path) -> bool:
    try:
        child.relative_to(parent)
        return True
    except ValueError:
        return False


def _validate_locations(source: Path, target: Path) -> Tuple[Path, Path]:
    source_root = _repository_root(source, "--source")
    if _is_root(target):
        raise SnapshotError("refusing to use a filesystem root as --target")
    target_root = _repository_root(target, "--target")

    # The output must be the checkout root.  Clearing a subdirectory of a
    # checkout would leave an ambiguous, incomplete public repository.
    if target != target_root:
        raise SnapshotError("--target must name the root of its checked-out Git repository")
    # Either containment direction is hazardous: clearing target could erase
    # the source or make it part of the source checkout being archived.
    if _is_within(target_root, source_root) or _is_within(source_root, target_root):
        raise SnapshotError("--source and --target must be separate, non-overlapping repositories")
    return source_root, target_root


def _validated_commit(source: Path, sha: str) -> str:
    if not _SHA_RE.fullmatch(sha):
        raise SnapshotError("--sha must be a full hexadecimal Git commit ID")
    resolved = _run_git(source, ["rev-parse", "--verify", sha + "^{commit}"]).stdout.strip()
    if resolved.lower() != sha.lower():
        raise SnapshotError("--sha must be a full commit ID, not an abbreviated revision")
    return resolved


def _validate_deployment_url(value: str) -> str:
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise SnapshotError("--deployment-url must be an absolute http(s) URL")
    return value


def _safe_archive_path(name: str) -> Tuple[str, ...]:
    path = PurePosixPath(name)
    if not name or path.is_absolute() or any(part in {"", ".", ".."} for part in path.parts):
        raise SnapshotError("archive contains an unsafe path: {!r}".format(name))
    return path.parts


def _is_excluded(parts: Tuple[str, ...]) -> bool:
    if any(part in _EXCLUDED_DIRECTORIES for part in parts[:-1]):
        return True
    name = parts[-1]
    return (
        name in _EXCLUDED_FILES
        or name.startswith(".env")
        or (len(parts) == 1 and name == PROVENANCE_FILE)
        or name in _EXCLUDED_DIRECTORIES
    )


def _resolved_link_target(parts: Tuple[str, ...], linkname: str) -> Tuple[str, ...]:
    target = PurePosixPath(linkname)
    if not linkname or target.is_absolute():
        raise SnapshotError("archive contains an unsafe symlink target: {!r}".format(linkname))
    resolved = list(parts[:-1])
    for component in target.parts:
        if component in {"", "."}:
            continue
        if component == "..":
            if not resolved:
                raise SnapshotError("archive symlink escapes the snapshot: {!r}".format(linkname))
            resolved.pop()
        else:
            resolved.append(component)
    return tuple(resolved)


def _read_archive(source: Path, commit: str) -> bytes:
    return _run_git(source, ["archive", "--format=tar", commit], text=False).stdout


def _validated_members(archive: bytes) -> List[tarfile.TarInfo]:
    try:
        with tarfile.open(fileobj=io.BytesIO(archive), mode="r:") as tar:
            members = tar.getmembers()
    except tarfile.TarError as error:
        raise SnapshotError("git produced an unreadable source archive") from error

    kept: List[tarfile.TarInfo] = []
    seen_paths = set()
    symlink_paths = set()
    for member in members:
        parts = _safe_archive_path(member.name)
        if _is_excluded(parts):
            continue
        if parts in seen_paths:
            raise SnapshotError("archive contains duplicate path: {}".format(member.name))
        seen_paths.add(parts)
        if member.isdir() or member.isreg():
            kept.append(member)
        elif member.issym():
            _resolved_link_target(parts, member.linkname)
            symlink_paths.add(parts)
            kept.append(member)
        else:
            raise SnapshotError("archive contains unsupported entry: {}".format(member.name))

    # A path below a symlink would cause writes to follow it.  Refuse it even
    # if the link itself is lexically safe, rather than relying on tar order.
    for path in seen_paths:
        for index in range(1, len(path)):
            if path[:index] in symlink_paths:
                raise SnapshotError("archive contains a descendant of a symlink: {}".format("/".join(path)))
    return kept


def _remove_tree_contents(directory: Path) -> None:
    """Remove contents without ever following a symlink, preserving .git."""
    with os.scandir(directory) as entries:
        for entry in entries:
            if entry.name == ".git":
                continue
            path = Path(entry.path)
            if entry.is_dir(follow_symlinks=False):
                _remove_tree_contents(path)
                os.rmdir(path)
            else:
                os.unlink(path)


def _destination(root: Path, parts: Tuple[str, ...]) -> Path:
    return root.joinpath(*parts)


def _extract_members(target: Path, archive: bytes, members: Iterable[tarfile.TarInfo]) -> None:
    # All members were checked before deleting existing content.  Do not use
    # TarFile.extract*; manual writes avoid its platform-dependent link rules.
    with tarfile.open(fileobj=io.BytesIO(archive), mode="r:") as tar:
        for member in members:
            parts = _safe_archive_path(member.name)
            destination = _destination(target, parts)
            if member.isdir():
                destination.mkdir(parents=True, exist_ok=True)
                continue
            destination.parent.mkdir(parents=True, exist_ok=True)
            if member.issym():
                os.symlink(member.linkname, destination)
                continue
            extracted = tar.extractfile(member)
            if extracted is None:
                raise SnapshotError("archive regular file could not be read: {}".format(member.name))
            with extracted, open(destination, "xb") as output:
                shutil.copyfileobj(extracted, output)
            os.chmod(destination, member.mode & 0o777)


def prepare_snapshot(source: Path, sha: str, target: Path, deployment_url: str) -> str:
    """Prepare a filtered source snapshot and return its resolved commit ID."""
    source = source.resolve()
    target = target.resolve()
    source_root, target_root = _validate_locations(source, target)
    commit = _validated_commit(source_root, sha)
    deployment_url = _validate_deployment_url(deployment_url)
    archive = _read_archive(source_root, commit)
    members = _validated_members(archive)

    _remove_tree_contents(target_root)
    _extract_members(target_root, archive, members)
    provenance = {
        "source_repository": SOURCE_REPOSITORY,
        "source_commit": commit,
        "deployment_url": deployment_url,
    }
    (target_root / PROVENANCE_FILE).write_text(
        json.dumps(provenance, indent=2, ensure_ascii=True) + "\n", encoding="utf-8"
    )
    return commit


def _parse_args(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, type=Path, help="private source Git checkout")
    parser.add_argument("--sha", required=True, help="full source commit ID to export")
    parser.add_argument("--target", required=True, type=Path, help="public target Git checkout")
    parser.add_argument("--deployment-url", required=True, help="public deployment URL recorded in provenance")
    return parser.parse_args(argv)


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = _parse_args(sys.argv[1:] if argv is None else argv)
    try:
        commit = prepare_snapshot(args.source, args.sha, args.target, args.deployment_url)
    except SnapshotError as error:
        print("sync-public-source: {}".format(error), file=sys.stderr)
        return 2
    print("Prepared public source snapshot for {}".format(commit))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
