import type { CaseDocument, GeneratedCase, TaskContext } from "./types.js";

function oneLine(value: string): string {
  return value.replace(/[|\n\r]+/g, " ").trim();
}

function list(values: string[], empty = "- Yok"): string {
  return values.length ? values.map(value => `- ${oneLine(value)}`).join("\n") : empty;
}

function html(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
}

function htmlList(values: string[]): string {
  return values.length ? `<ul>${values.map(value => `<li>${html(value)}</li>`).join("")}</ul>` : "<p class=\"muted\">Yok</p>";
}

function renderTaskMarkdown(task: TaskContext): string[] {
  return [
    "## Task Baglami",
    "",
    `- **Jira task:** [${task.key}](${task.url})`,
    `- **Baslik:** ${oneLine(task.summary)}`,
    `- **Durum:** ${oneLine(task.status)}`,
    `- **Tip:** ${oneLine(task.issueType)}`,
    `- **Oncelik:** ${oneLine(task.priority ?? "Belirtilmemis")}`,
    "",
    "### Acceptance Criteria",
    "",
    list(task.acceptanceCriteria, "- Ayrica acceptance criteria okunamadi; task description kullanildi."),
    ""
  ];
}

function renderTaskHtml(task: TaskContext): string {
  return `<section class=\"task-context\"><h2>${html(task.key)}: ${html(task.summary)}</h2><p><strong>Durum:</strong> ${html(task.status)} &nbsp; <strong>Tip:</strong> ${html(task.issueType)} &nbsp; <strong>Oncelik:</strong> ${html(task.priority ?? "Belirtilmemis")}</p><p><a href=\"${html(task.url)}\">Jira maddesini ac</a></p><h3>Acceptance criteria</h3>${htmlList(task.acceptanceCriteria)}</section>`;
}

function renderCaseHtmlItem(testCase: GeneratedCase, index: number): string {
  const tags = testCase.tags.map(tag => `<span class=\"tag\">${html(tag)}</span>`).join("");
  return `<article class=\"case\">
  <div class=\"case-heading\"><span class=\"number\">${index}</span><div><h2>${html(testCase.title)}</h2><div class=\"meta\"><span class=\"badge ${testCase.category}\">${html(testCase.category)}</span><span class=\"badge priority\">${html(testCase.priority)}</span>${tags}</div></div></div>
  <p class=\"case-id\">${html(testCase.id)}</p>
  <h3>Neden bu case var?</h3><p>${html(testCase.rationale)}</p>
  <div class=\"columns\"><section><h3>Uygulama adimlari</h3>${htmlList(testCase.steps)}</section><section><h3>Beklenen gozlemler</h3>${htmlList(testCase.oracles)}</section></div>
  <details><summary>Kaynak baglami</summary><p><strong>Jira:</strong> ${testCase.sourceIssues.length ? testCase.sourceIssues.map(issue => `<code>${html(issue)}</code>`).join(", ") : "Baseline case"}</p><p><strong>Kod dosyalari:</strong></p>${htmlList(testCase.sourceCodeFiles)}</details>
</article>`;
}

function renderCase(testCase: GeneratedCase, index: number): string {
  return [
    `## ${index}. ${testCase.title}`,
    "",
    `- **Kategori:** ${testCase.category}`,
    `- **Oncelik:** ${testCase.priority}`,
    `- **Etiketler:** ${testCase.tags.join(", ")}`,
    `- **Case ID:** \`${testCase.id}\``,
    "",
    "### Neden bu case var?",
    "",
    oneLine(testCase.rationale),
    "",
    "### Kaynak",
    "",
    `**Jira maddeleri:** ${testCase.sourceIssues.length ? testCase.sourceIssues.map(issue => `\`${issue}\``).join(", ") : "Yok; baseline case"}`,
    "",
    "**Kod dosyalari:**",
    list(testCase.sourceCodeFiles),
    "",
    "### Uygulama adimlari",
    "",
    list(testCase.steps),
    "",
    "### Beklenen gozlemler",
    "",
    list(testCase.oracles),
    ""
  ].join("\n");
}

export function renderCaseSummary(document: CaseDocument): string {
  const counts = document.cases.reduce<Record<string, number>>((result, testCase) => {
    result[testCase.category] = (result[testCase.category] ?? 0) + 1;
    return result;
  }, {});

  return [
    document.task ? `# ${document.task.key} Task Bazli Exploratory Test Case Ozeti` : "# Uretilen Exploratory Test Case Ozeti",
    "",
    "Bu dosya lead ve test raporu incelemesi icin okunabilir ozettir. Ham makine ciktisi `generated-cases.json` dosyasindadir.",
    "",
    "## Kosum Baglami",
    "",
    `- **Proje:** \`${document.generatedFor.projectKey}\``,
    `- **Sprint:** ${oneLine(document.generatedFor.sprintName)}`,
    `- **Sprint ID:** \`${document.generatedFor.sprintId}\``,
    `- **Okunan Jira issue sayisi:** ${document.sourceIssueCount}`,
    `- **Kod analiz durumu:** ${document.codeIntelligence.status}`,
    `- **Kod risk sinyalleri:** ${document.codeIntelligence.signals.map(signal => signal.tag).join(", ") || "Yok"}`,
    `- **Toplam case:** ${document.cases.length}`,
    `- **Dagilim:** smoke ${counts.smoke ?? 0}, exploratory ${counts.exploratory ?? 0}, monkey ${counts.monkey ?? 0}`,
    "",
    ...(document.task ? renderTaskMarkdown(document.task) : []),
    "## Bu Cikti Neyi Gosteriyor?",
    "",
    "Case'ler acceptance criterion'lari birebir assertion'a cevirmek yerine Jira sprint baglamini ve lokal kod risklerini uygulamanin kirilma sinyallerine donusturur.",
    "",
    document.cases.map(renderCase).join("\n")
  ].join("\n");
}

export function renderCaseHtml(document: CaseDocument): string {
  const counts = document.cases.reduce<Record<string, number>>((result, testCase) => {
    result[testCase.category] = (result[testCase.category] ?? 0) + 1;
    return result;
  }, {});
  const signals = document.codeIntelligence.signals.map(signal => `<span class=\"tag\">${html(signal.tag)}</span>`).join("");
  const cases = document.cases.map(renderCaseHtmlItem).join("\n");
  return `<!doctype html>
<html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>Exploratory Test Case Summary</title>
<style>
:root{color-scheme:light;--ink:#17202a;--muted:#5f6b76;--line:#dce3e8;--blue:#146c94;--green:#247a55;--amber:#a56412;--bg:#f6f8fa;--card:#fff}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 -apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif}main{max-width:1100px;margin:0 auto;padding:36px 24px 64px}header{background:var(--ink);color:white;padding:28px;border-radius:10px;margin-bottom:20px}h1,h2,h3,p{margin-top:0}h1{font-size:28px;margin-bottom:8px}h2{font-size:20px;margin:0 0 8px}h3{font-size:14px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);margin:20px 0 8px}.subtitle{color:#d7e2ea}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:20px 0}.metric,.case,.task-context{background:var(--card);border:1px solid var(--line);border-radius:8px}.metric{padding:16px}.metric strong{display:block;font-size:26px}.metric span{color:var(--muted)}.context,.task-context{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:20px;margin-bottom:20px}.context p,.task-context p{margin:5px 0}.tag,.badge{display:inline-block;border-radius:999px;padding:2px 8px;margin:2px 4px 2px 0;font-size:12px;background:#e8f1f5;color:var(--blue)}.badge{font-weight:700}.badge.smoke{background:#e4f3ea;color:var(--green)}.badge.monkey{background:#fff0d9;color:var(--amber)}.badge.exploratory{background:#e5eef9;color:#315f9a}.priority{background:#f0f2f4;color:#46515b}.case{padding:22px;margin:14px 0}.case-heading{display:flex;gap:14px;align-items:flex-start}.number{width:32px;height:32px;border-radius:50%;background:var(--ink);color:#fff;display:grid;place-items:center;font-weight:700;flex:none}.case-id{font:12px ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--muted);margin-left:46px}.columns{display:grid;grid-template-columns:1fr 1fr;gap:24px}.case ul,.task-context ul{padding-left:20px;margin:4px 0}.case li,.task-context li{margin:5px 0}.muted{color:var(--muted)}details{border-top:1px solid var(--line);margin-top:18px;padding-top:12px;color:var(--muted)}summary{cursor:pointer;font-weight:600;color:var(--ink)}code{background:#eef2f4;padding:2px 5px;border-radius:4px}@media(max-width:720px){main{padding:20px 12px}.summary{grid-template-columns:1fr 1fr}.columns{grid-template-columns:1fr}header{padding:20px}h1{font-size:23px}}
</style></head><body><main>
<header><h1>${document.task ? `${html(document.task.key)} Task Exploratory Test Report` : "Uretilen Exploratory Test Case Ozeti"}</h1><p class=\"subtitle\">${document.task ? "Tek bir Jira taskinin acceptance criteria, task metni ve kod risklerinden uretilen case gorunumu." : "Jira sprint baglami ve lokal kod risklerinden uretilen, lead incelemesine uygun case gorunumu."}</p></header>
<section class=\"summary\"><div class=\"metric\"><strong>${html(document.generatedFor.projectKey)}</strong><span>Proje</span></div><div class=\"metric\"><strong>${document.task ? html(document.task.key) : html(document.generatedFor.sprintName)}</strong><span>${document.task ? "Jira task" : "Aktif sprint"}</span></div><div class=\"metric\"><strong>${document.sourceIssueCount}</strong><span>${document.task ? "Task" : "Okunan Jira issue"}</span></div><div class=\"metric\"><strong>${document.cases.length}</strong><span>Uretilen case</span></div></section>
<section class=\"context\"><p><strong>Kod analiz durumu:</strong> ${html(document.codeIntelligence.status)}</p><p><strong>Case dagilimi:</strong> smoke ${counts.smoke ?? 0}, exploratory ${counts.exploratory ?? 0}, monkey ${counts.monkey ?? 0}</p><p><strong>Kod risk sinyalleri:</strong> ${signals || "Yok"}</p></section>
${document.task ? renderTaskHtml(document.task) : ""}
${cases}
</main></body></html>`;
}
