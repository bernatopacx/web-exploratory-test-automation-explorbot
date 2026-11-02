# Evidence Schema

```json
{
  "evidenceId": "cw-xxxx-001-screen-01",
  "caseId": "cw-xxxx-001",
  "kind": "screenshot|video|trace|network|log|report",
  "path": "screenshots/cw-xxxx-001-settled.png",
  "environment": "dev|staging|prod|local",
  "viewport": "1440x900",
  "theme": "light|dark|not-applicable",
  "capturedAt": "ISO-8601 timestamp",
  "sanitized": true,
  "proves": "What the artifact demonstrates",
  "limitations": []
}
```

A screenshot proves visible UI at one moment. A video proves a recorded sequence only when its starting state and target are identifiable. A trace may contain secrets and must be sanitized. Network evidence should retain only the minimum metadata needed for the claim. Reports must distinguish “artifact exists” from “artifact proves the requirement.”
