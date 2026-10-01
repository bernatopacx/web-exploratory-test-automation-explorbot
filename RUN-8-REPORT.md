# Exploratory Test Run #8

## Result

- Status: passed
- Commit: `1928da7`
- Jira discovery: 410 issues from `CW Sprint 35`
- Generated cases: 10
- Playwright tests: 13 passed, 0 failed
- Browser mode: headless Chromium
- Artifact: 88 files, 10.4 MB

## Fixed Issues

1. Jira pagination tokens were not forwarded to the next request. This caused `generate` to keep fetching pages.
2. Jira `503`, `ECONNRESET`, and response-body timeout failures now use bounded retries and request timeouts.
3. A known Google Identity Services console message was incorrectly treated as an application failure. It is now narrowly ignored for `chatbotapp` only; other page and console errors still fail tests.

## Artifacts

- [Workflow run](https://github.com/bernatopacx/web-exploratory-test-automation/actions/runs/36012883078)
- [Download artifacts](https://github.com/bernatopacx/web-exploratory-test-automation/actions/runs/36012883078/artifacts/10812799068)

The artifact contains screenshots, videos, traces, Playwright JSON output, generated cases, Jira sprint data, and code-intelligence output.

## Local Code Intelligence

Source used:

`work/extract/fe-chatbot-main/src/v2`

The local scan found 999 source files and these signals:

`navigation`, `async`, `image`, `responsive`, `auth`, `persistence`, `modal`, `input`

CI intentionally does not read the frontend repository yet. Code intelligence is currently supplied from the local frontend checkout.
