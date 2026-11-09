"""Focused integration tests for the public source snapshot exporter."""

import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


SCRIPT = Path(__file__).resolve().parents[1] / "sync-public-source.py"
SPEC = importlib.util.spec_from_file_location("sync_public_source", SCRIPT)
sync_public_source = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(sync_public_source)


def git(directory, *arguments):
    return subprocess.run(
        ["git", "-C", str(directory), *arguments],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    ).stdout.strip()


def initialize_repository(directory):
    directory.mkdir(parents=True, exist_ok=True)
    git(directory, "init")
    git(directory, "config", "user.email", "snapshot-test@example.invalid")
    git(directory, "config", "user.name", "Snapshot Test")


def write_file(root, name, content="content"):
    path = root / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


class SyncPublicSourceTests(unittest.TestCase):
    deployment_url = "https://public.example.invalid/chessticize"

    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.base = Path(self.temporary.name)
        self.source = self.base / "private-source"
        self.target = self.base / "public-target"
        initialize_repository(self.source)
        initialize_repository(self.target)
        write_file(self.target, "README.md", "old public checkout")
        git(self.target, "add", "README.md")
        git(self.target, "commit", "-m", "initial public checkout")

    def tearDown(self):
        self.temporary.cleanup()

    def source_commit(self, *, unsafe_link=False):
        included = {
            "README.md": "A public README\n",
            "LICENSE": "public license\n",
            "app/page.tsx": "export default function Page() { return null }\n",
            "next.config.mjs": "export default {}\n",
            "docs/guide.md": "guide\n",
            "__tests__/page.test.ts": "test('page', () => {})\n",
            "nested/keep.txt": "keep\n",
        }
        excluded = {
            ".github/workflows/private.yml": "private workflow\n",
            ".augment/rules.md": "agent rule\n",
            ".agents/config": "agent config\n",
            ".claude/settings.json": "agent config\n",
            ".codex/config": "agent config\n",
            ".cursor/rules": "agent config\n",
            ".windsurf/rules": "agent config\n",
            "nested/AGENT.md": "agent instructions\n",
            "nested/AGENTS.md": "agent instructions\n",
            "nested/CLAUDE.md": "agent instructions\n",
            "nested/GEMINI.md": "agent instructions\n",
            "nested/.env.production": "SECRET=not-public\n",
            ".env": "SECRET=not-public\n",
            "nested/.DS_Store": "not-public\n",
            "node_modules/library/index.js": "generated\n",
            ".next/cache/data": "generated\n",
            ".vercel/.env.production.local": "SECRET=not-public\n",
            ".pnpm-store/data": "generated\n",
            "emulator-data/auth.json": "private fixture\n",
            "dist/bundle.js": "generated\n",
            "build/output.js": "generated\n",
            "coverage/report.html": "generated\n",
            "PUBLIC_SOURCE.json": "wrong provenance\n",
        }
        for name, content in dict(included, **excluded).items():
            write_file(self.source, name, content)
        link_target = "../../outside" if unsafe_link else "README.md"
        os.symlink(link_target, self.source / "public-link")
        git(self.source, "add", "-A")
        git(self.source, "commit", "-m", "private source")
        return git(self.source, "rev-parse", "HEAD"), included, excluded

    def snapshot(self, target=None, sha=None):
        if sha is None:
            sha, _, _ = self.source_commit()
        return sync_public_source.prepare_snapshot(
            self.source,
            sha,
            self.target if target is None else target,
            self.deployment_url,
        )

    def test_exports_only_tracked_allowed_files_and_preserves_git(self):
        sha, included, excluded = self.source_commit()
        write_file(self.target, "stale/deep/file.txt", "remove me")
        outside = self.base / "outside-target"
        outside.mkdir()
        write_file(outside, "must-not-change.txt", "safe")
        os.symlink(outside, self.target / "stale-link")

        self.assertEqual(sha, self.snapshot(sha=sha))

        for name, content in included.items():
            self.assertEqual(content, (self.target / name).read_text(encoding="utf-8"))
        for name in excluded:
            if name == "PUBLIC_SOURCE.json":
                continue
            self.assertFalse((self.target / name).exists(), name)
        self.assertFalse((self.target / "stale").exists())
        self.assertFalse((self.target / "stale-link").exists())
        self.assertEqual("safe", (outside / "must-not-change.txt").read_text(encoding="utf-8"))
        self.assertTrue((self.target / ".git").exists())
        self.assertEqual("true", git(self.target, "rev-parse", "--is-inside-work-tree"))
        self.assertTrue((self.target / "public-link").is_symlink())
        self.assertEqual("README.md", os.readlink(self.target / "public-link"))
        self.assertEqual(
            {
                "source_repository": "Chessticize/v0-chessticize",
                "source_commit": sha,
                "deployment_url": self.deployment_url,
            },
            json.loads((self.target / "PUBLIC_SOURCE.json").read_text(encoding="utf-8")),
        )

    def test_unsafe_symlink_is_rejected_before_target_is_cleared(self):
        sha, _, _ = self.source_commit(unsafe_link=True)
        write_file(self.target, "keep-if-rejected.txt", "existing target content")

        with self.assertRaisesRegex(sync_public_source.SnapshotError, "symlink escapes"):
            self.snapshot(sha=sha)

        self.assertEqual(
            "existing target content",
            (self.target / "keep-if-rejected.txt").read_text(encoding="utf-8"),
        )
        self.assertFalse((self.target / "public-link").exists())

    def test_unsafe_target_relationships_and_root_are_rejected(self):
        sha, _, _ = self.source_commit()

        with self.assertRaises(sync_public_source.SnapshotError):
            self.snapshot(target=self.source, sha=sha)

        nested_target = self.source / "nested-public-target"
        initialize_repository(nested_target)
        with self.assertRaises(sync_public_source.SnapshotError):
            self.snapshot(target=nested_target, sha=sha)

        with self.assertRaises(sync_public_source.SnapshotError):
            self.snapshot(target=Path(os.path.abspath(os.sep)), sha=sha)

    def test_same_commit_produces_reproducible_snapshot_bytes(self):
        sha, _, _ = self.source_commit()
        second_target = self.base / "second-public-target"
        initialize_repository(second_target)
        write_file(second_target, "old.txt", "old")

        self.snapshot(sha=sha)
        self.snapshot(target=second_target, sha=sha)

        self.assertEqual(self.tree_digest(self.target), self.tree_digest(second_target))

    @staticmethod
    def tree_digest(root):
        digest = hashlib.sha256()
        for path in sorted(root.rglob("*")):
            relative = path.relative_to(root)
            if relative.parts[0] == ".git":
                continue
            digest.update(str(relative).encode("utf-8"))
            if path.is_symlink():
                digest.update(b"L")
                digest.update(os.readlink(path).encode("utf-8"))
            elif path.is_file():
                digest.update(b"F")
                digest.update(path.read_bytes())
        return digest.hexdigest()


if __name__ == "__main__":
    unittest.main()
