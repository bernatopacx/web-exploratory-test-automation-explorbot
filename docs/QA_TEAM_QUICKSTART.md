# QA Team Quickstart

This repository is the shared release and exploratory QA runner. It turns a Jira task into traceable cases, runs them against the approved environment, and uploads evidence with the exact FE/BE source SHAs used by that run.

## First-time setup

1. Clone `https://github.com/bernatopacx/web-exploratory-test-automation-explorbot`.
2. Install Node.js 24 and dependencies with `npm install`.
3. Install Chromium with `npx playwright install chromium`.
4. Copy `.env.example` to `.env` and add local Jira credentials only; never commit `.env`.
5. Copy `skills/release-exploratory-qa/` into the local Codex skills directory if you want the reusable skill available in Codex.

## Run a task locally

```bash
JIRA_ISSUE_KEY=CW-1234 npm run sync:repos
JIRA_ISSUE_KEY=CW-1234 npm run generate
JIRA_ISSUE_KEY=CW-1234 npm test
```

Review these outputs:

- `artifacts/source-repositories.json`: exact FE/BE repository refs and commit SHAs.
- `artifacts/task-cw-1234.html`: task-scoped case and acceptance report.
- `test-results/`: screenshots, videos, traces, and Playwright results.

## Run from GitHub Actions

Open **Actions > Sprint Exploratory Tests > Run workflow**, provide `issue_key` when task scope is needed, and select the approved app/environment inputs. The workflow checks out the configured FE and BE refs on every run. For private source repositories, the repository admin must configure `SOURCE_REPOSITORY_TOKEN` as a read-only secret and set the `FRONTEND_*` and `BACKEND_*` variables if defaults differ.

Use the uploaded workflow artifact as the review package. A result is not considered proven merely because a test process exited successfully; the report must link each result to its case and evidence.

## Keeping runs current

The QA repository does not mirror FE or BE source. Each run consumes fresh upstream checkouts and records their SHAs. The scheduled workflow is the fallback. For immediate runs after a source push, add the `repository_dispatch` notifier described in `docs/SOURCE_REPOSITORY_SETUP.md` to the upstream repository.

## Team guardrails

- Do not put passwords, tokens, cookies, or raw auth state in issues, reports, artifacts, or commits.
- Use staging/dev URLs and test accounts.
- Keep destructive, purchasing, publishing, and external-message actions out of exploratory runs unless explicitly approved.
- Mark missing evidence as `NOT VERIFIABLE`, not `PASS`.
