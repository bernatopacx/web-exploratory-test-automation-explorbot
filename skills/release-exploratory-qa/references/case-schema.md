# Case Schema

```json
{
  "caseId": "cw-xxxx-001",
  "requirementRefs": ["CW-xxxx"],
  "title": "Observable behavior",
  "category": "smoke|acceptance|negative|exploratory|visual|responsive|accessibility|backend",
  "priority": "P0|P1|P2|P3",
  "preconditions": ["Target environment is available"],
  "steps": ["Open ...", "Select ...", "Submit ..."],
  "expected": ["Visible result or actionable error is shown"],
  "riskSignals": ["navigation", "async", "auth"],
  "evidencePlan": ["screenshot", "trace"],
  "status": "not-run",
  "observed": null,
  "evidence": [],
  "notes": []
}
```

`requirementRefs` must point to Jira or be labeled `inferred`. Steps must be repeatable. Expected results must be observable. Use separate cases for different environments, account classes, or feature variants. Never put credentials, cookies, bearer tokens, or private document contents in the record.
