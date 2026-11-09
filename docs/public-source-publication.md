# Public frontend source

`v0-chessticize` is the development repository. `Chessticize/chessticize-web`
publishes clean frontend source snapshots with its own history. Private repository
history, environment files, agent instructions and build caches are not copied.
The GPL license, source, assets and files needed to build the frontend are included.
Hosted service terms remain separate from the published source license.

After a successful Vercel **Production** deployment, `Sync Deployed Public Source`
selects the latest successful production deployment and publishes that exact Git
commit. Preview deployments do not publish source. Failed production builds do not
advance the public snapshot. Repeated events are idempotent. `PUBLIC_SOURCE.json`
records the source commit and deployment URL. Production deployments must come from
committed source on `main`; do not deploy dirty local snapshots under a different
commit identity.

The workflow can also be dispatched manually to catch up the public repository
with the latest successful production deployment. It does not build or deploy the
application, so publishing source cannot replace the running application.

Authentication uses `PUBLIC_WEB_PUSH_TOKEN`, a source repository Actions secret
containing a fine-grained token scoped to `Chessticize/chessticize-web` with
Contents read/write permission. The target repository disables SSH deploy keys.
Do not use a broad personal token. The publication job runs trusted scripts from
`main` and does not execute the deployed source. The token is passed through the
GitHub CLI credential helper, never embedded in clone URLs or public files.

To validate the export locally:

```sh
python3 -m unittest discover -s scripts/tests
```
