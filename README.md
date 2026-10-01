# Web Exploratory Test Automation

Reusable Playwright infrastructure for sprint-based smoke, exploratory, and bounded monkey testing across web apps.

## How it works

1. Load an app profile from `apps/<app-id>.json`.
2. Resolve the active sprint from the configured Jira board.
3. Read sprint issues through Jira REST API using read-only credentials.
4. Read the configured development branch of the source application and calculate a git diff.
5. Extract risk signals from Jira text and changed code files.
6. Generate stable, implementation-agnostic test charters under `artifacts/generated-cases.json`.
7. Execute the generic smoke, exploratory, and monkey probes with Playwright.

The generator deliberately does not turn every acceptance criterion into a brittle feature assertion. It uses sprint text and code changes to select risk dimensions such as navigation, focus, persistence, async interruption, responsive behavior, and authentication recovery. Localization is intentionally out of scope for this phase.

App profiles may define a narrow `ignoredConsoleErrorPatterns` list for known third-party browser noise. Each entry should be justified by the local source review; all other page errors and console errors remain test failures.

## Local setup

```bash
cp .env.example .env
npm install
npx playwright install chromium
npm run generate
npm test
```

For code intelligence, point the local runner at the application project. A git checkout is preferred; an extracted ZIP also works and is analyzed as a local source tree:

```bash
SOURCE_REPO_PATH=work/extract/fe-chatbot-main/src/v2 \
SOURCE_REPO=hubxco/fe-chatbot \
SOURCE_REPO_DIFF_BASE=origin/main \
npm run generate
```

Use `HEADED=true npm test` to run with a visible browser. The same run still records screenshots, video, trace, HTML, and JSON results.

To generate a task-specific report, provide a Jira key. This keeps the sprint report and adds a separate task report:

```bash
JIRA_ISSUE_KEY=CW-1819 npm run generate
JIRA_ISSUE_KEY=CW-1819 npm test
open artifacts/task-cw-1819.html
```

When `JIRA_ISSUE_KEY` is set, the generated Playwright inventory uses the task-specific JSON file, so the test titles and evidence are scoped to that issue. Without it, the normal sprint inventory is used.

Set `JIRA_EMAIL` and `JIRA_API_TOKEN` locally. Never commit them. For authenticated apps, create a Playwright storage state file outside git and point `AUTH_STORAGE_STATE` to it.

Jira requests use a 15-second timeout and two bounded retries by default. Override `JIRA_REQUEST_TIMEOUT_MS` when a project needs a different network budget.

Generation actions are disabled by default because they may consume product quota. Enable them explicitly with `ALLOW_GENERATION_TESTS=true`.

## Adding another web app

Copy `apps/chatbotapp.json`, change the URL, Jira project key/board id, capabilities, and semantic locators, then run with `APP_ID=<new-id>`. The Jira adapter and test engine stay shared.

## CI inputs

Configure `JIRA_BASE_URL`, `JIRA_EMAIL`, and `JIRA_API_TOKEN` as GitHub Secrets. `AUTH_STORAGE_STATE_B64` is required for authenticated app surfaces. Code intelligence is currently a local-only input: set `SOURCE_REPO_PATH` to the local project directory. Git metadata is used when available; the extracted ZIP is scanned as a local source tree.

The workflow supports both browser modes. Leave `headed=false` for a normal headless CI run; choose `headed=true` to run Chromium under `xvfb` with a virtual display. CI cannot show a physical browser window on your computer, but both modes produce the same artifacts for inspection.

## Current guardrails

- Jira access is read-only.

## Explorbot variant

This repository is the AI-assisted variant of the original project. The original repository remains unchanged and continues to provide the deterministic Jira, code-intelligence, and Playwright baseline. This repository adds Explorbot as an opt-in UI exploration engine.

The flow is:

1. Read the active Jira sprint and, when supplied, one selected issue.
2. Read the configured development source tree and derive code-risk signals.
3. Generate the normal smoke/exploratory/monkey cases.
4. Write `artifacts/explorbot/mission.json` and a safe Markdown knowledge file.
5. Optionally run Explorbot against an explicit dev/staging path.
6. Store the command output and run status under `artifacts/explorbot/`.

Mission generation never calls an AI provider. The external Explorbot process starts only when `EXPLORBOT_ENABLED=true`; this makes local comparison and cost control explicit.

### Local mission generation

```bash
JIRA_ISSUE_KEY=CW-1819 npm run generate
open artifacts/explorbot/mission.json
open artifacts/task-cw-1819.html
```

For the selected task, provide the real development or staging route before running an AI exploration. The chatbot profile intentionally leaves it unresolved because a conversation URL may require an authenticated, seeded session:

```bash
EXPLORBOT_TARGET_PATH=/chats/<seeded-chat-id> \
EXPLORBOT_ENABLED=true \
EXPLORBOT_AI_PROVIDER=openai \
JIRA_ISSUE_KEY=CW-1819 \
npm run explorbot:run
```

Install Explorbot in this separate repository only when you are ready to run it:

```bash
npm install explorbot --save-dev
npx playwright install chromium
```

The provider API key must be supplied through the local environment or GitHub Actions secret. Never commit it or place it in `docs/` knowledge files.

### GitHub Actions

Run the workflow on `main`. Leave `run_explorbot=false` for the deterministic baseline. To run the AI-assisted path, set `run_explorbot=true`, enter `issue_key` when task scope is wanted, and provide `explorbot_target_path`. Configure `EXPLORBOT_AI_PROVIDER` as a repository variable and the provider-specific API key as a repository secret before enabling the job.

The workflow still uploads the normal Playwright screenshots, videos, traces, and reports. Explorbot's stdout, stderr, mission, and run summary are uploaded in the same artifact under `artifacts/explorbot/`.

## What this variant does not do

- It does not write Jira issues, comments, transitions, or test cases.
- It does not infer a safe authenticated conversation route from the homepage.
- It does not run against production by design.
- It does not replace the deterministic Playwright smoke suite; it complements it with adaptive exploration.
- Test navigation is bounded by a safe path allow-list.
- Monkey actions are seeded and capped by action count and duration.
- Generation is opt-in.
- Screenshots, traces, WebM videos, compatible MP4 recordings, generated cases, code-intelligence output, and sprint snapshots are uploaded on every CI completion.

## Delivery documents

- `docs/OKR_DELIVERY_REPORT.md`: OKR teslim raporu, son kosum metrikleri ve sonraki fazlar.
- `docs/HANDOFF_GUIDE.md`: lokal ve GitHub Actions calistirma rehberi.
- `docs/EVIDENCE_INDEX.md`: son kosum screenshot ve video kanitlarinin index'i.
- `artifacts/generated-cases.md`: lead ve rapor incelemesi icin okunabilir case ozeti.
- `artifacts/generated-cases.html`: ayni ozetin tarayicida sunuma uygun gorunumu.
- `artifacts/task-<issue-key>.html`: tek Jira taski icin acceptance criteria ve taska bagli case raporu.
