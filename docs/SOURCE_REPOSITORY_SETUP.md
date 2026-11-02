# Source Repository Setup

This repository consumes FE and BE source for code intelligence and risk-based case generation. It does not mirror their source history.

## Required GitHub configuration

Repository secrets:

- `JIRA_BASE_URL`
- `JIRA_EMAIL`
- `JIRA_API_TOKEN`
- `SOURCE_REPOSITORY_TOKEN`: read-only token that can read the configured private FE and BE repositories
- `AUTH_STORAGE_STATE_B64` when the target app needs an authenticated browser session

Repository variables:

- `FRONTEND_REPOSITORY` (default: `hubxco/fe-chatbot`)
- `FRONTEND_REF` (default: `development`)
- `BACKEND_REPOSITORY` (default: `hubxco/be-chatbot-wl`)
- `BACKEND_REF` (default: `main`)

The source token should be read-only. Do not put it in `apps/*.json`, an artifact, a report, or a workflow log.

## What happens on a run

1. The QA repository is checked out.
2. The configured FE and BE refs are checked out into `work/repos/`.
3. Jira and source analysis run against those checkouts.
4. `artifacts/source-repositories.json` records each repository, requested ref, resolved SHA, path, and status.
5. The report and evidence bundle are uploaded as the workflow artifact.

The resolved SHA is the reproducibility anchor. A branch name alone is not enough for a release report.

## Immediate trigger after an upstream push

The QA workflow accepts a `repository_dispatch` event of type `source-repository-updated`. A source repository can call the dispatch endpoint from a workflow after a push. The caller needs a token that can dispatch workflows in the QA repository:

```yaml
name: Notify QA automation

on:
  push:
    branches: [main, development]

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger QA exploration
        env:
          GH_TOKEN: ${{ secrets.QA_AUTOMATION_DISPATCH_TOKEN }}
        run: |
          curl --fail-with-body -X POST \
            -H "Accept: application/vnd.github+json" \
            -H "Authorization: Bearer ${GH_TOKEN}" \
            https://api.github.com/repos/bernatopacx/web-exploratory-test-automation-explorbot/dispatches \
            -d '{"event_type":"source-repository-updated","client_payload":{"repository":"${GITHUB_REPOSITORY}","sha":"${GITHUB_SHA}"}}'
```

Use the scheduled workflow as the fallback if the upstream repositories cannot be changed. The dispatch should start a QA run; it must not automatically create Jira bugs or mutate production data.

## Local workflow

```bash
npm run sync:repos
npm run generate
```

The sync command updates only managed `work/repos/*` checkouts. A path supplied through `FRONTEND_SOURCE_REPO_PATH`, `BACKEND_SOURCE_REPO_PATH`, or legacy `SOURCE_REPO_PATH` is inspected without being rewritten.
