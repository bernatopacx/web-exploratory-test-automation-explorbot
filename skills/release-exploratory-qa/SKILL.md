---
name: release-exploratory-qa
description: Build and run traceable web release, regression, and exploratory QA from Jira requirements, live environments, repositories, and design references. Use when a QA needs cases, execution evidence, coverage, bug candidates, or a release summary for a web feature.
metadata:
  short-description: Run evidence-backed web release and exploratory QA
---

# Release Exploratory QA

Turn a Jira feature into a repeatable QA run. Every conclusion must connect a requirement to an action, an observation, and evidence.

## Rules

- Read parent task, subtasks, acceptance criteria, links, comments, design references, and implementation context before running tests.
- Keep Jira, design, source code, deployed runtime, and captured evidence as separate sources with provenance.
- Generate cases before execution. Cover acceptance criteria first, then relevant smoke, negative, interruption/recovery, responsive, theme, accessibility, and error-state risks.
- Verify the target URL, environment, account class, plan/entitlement, and feature flag before recording results.
- Use `PASS`, `FAIL`, `BLOCKED`, `NOT RUN`, and `NOT VERIFIABLE`; missing evidence is never a pass.
- Capture case-linked screenshots, videos, traces, and sanitized network evidence at meaningful checkpoints. A landing-page screenshot or blank video does not prove an interaction.
- Never store passwords, tokens, cookies, private keys, service-account JSON, or raw auth material in the skill, reports, or artifacts.
- Do not infer chatbot business behavior from an unrelated infrastructure repository. Require the actual deployed contract, logs, or source before making backend claims.
- Do not run destructive, purchasing, publishing, external-messaging, or production-mutating actions without explicit authorization.

## Workflow

1. Collect `taskKey`, task URL, frontend URL, environment, account class, backend repository/branch, design URL, and release scope.
2. Build a requirement-to-case map.
3. Refresh or checkout the configured FE/BE repositories and record their exact commit SHAs.
4. Inspect source changes for risk signals and inspect the design when visual requirements exist.
5. Generate independently runnable cases with preconditions, steps, expected results, and evidence plans.
6. Run the deterministic smoke and acceptance checks, then bounded exploratory cases.
7. Reproduce failures once and classify them as product, environment, data, permission, or evidence gaps.
8. Produce the HTML report, structured results, coverage matrix, evidence index, bug candidates, and release summary.
9. State every blocked, unverified, or out-of-scope area and the required follow-up.

Read [source-sync.md](references/source-sync.md) for the GitHub source workflow, [case-schema.md](references/case-schema.md) for case records, and [evidence-schema.md](references/evidence-schema.md) for artifact rules. Read [chatbot-project-reference.md](references/chatbot-project-reference.md) only for this chatbot project.
