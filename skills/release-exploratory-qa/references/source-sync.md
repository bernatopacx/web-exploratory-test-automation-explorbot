# GitHub Source Sync

The QA repository is the automation and evidence source of truth. FE and BE repositories remain their own sources of truth.

## Local

Configure source repositories in `apps/<app-id>.json`, then run:

```bash
npm run sync:repos
npm run generate
```

The sync command writes `artifacts/source-repositories.json` with repository, requested ref, checkout path, status, and commit SHA. It refuses to rewrite a checkout with local changes. Explicit `*_SOURCE_REPO_PATH` overrides are inspected but never fetched or detached by the sync command.

## GitHub Actions

The workflow checks out the configured FE and BE refs into `work/repos/` on every run. For private repositories, configure a read-only `SOURCE_REPOSITORY_TOKEN` secret. Use repository variables to override:

- `FRONTEND_REPOSITORY`, `FRONTEND_REF`
- `BACKEND_REPOSITORY`, `BACKEND_REF`

The workflow supports both the scheduled fallback and the `source-repository-updated` `repository_dispatch` event. A source repository can dispatch that event after a push when immediate QA is required. The resulting run records the exact source SHAs in the artifact manifest.

Do not copy FE or BE source into the QA repository history. Do not use a moving branch name in a report without also recording the resolved SHA.
