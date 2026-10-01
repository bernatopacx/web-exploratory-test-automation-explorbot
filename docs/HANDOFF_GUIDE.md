# Teslim ve Handoff Rehberi

## Repoyu Calistirma

```bash
cp .env.example .env
npm install
npx playwright install chromium
npm run typecheck
```

`.env` icine Jira email ve API token eklenir. Secret degerleri repoya commit edilmez.

## Lokal Kaynak Analizi

```bash
SOURCE_REPO_PATH=work/extract/fe-chatbot-main/src/v2 \
SOURCE_REPO=hubxco/fe-chatbot \
npm run generate
```

Git checkout varsa development diff'i kullanilir. ZIP kaynakta git metadata yoksa kaynak agaci taranir.

## Lokal Test Kosumu

```bash
npm test
```

Gorunur browser icin:

```bash
HEADED=true npm test
```

## GitHub Actions Kosumu

1. Repository -> Actions -> `Sprint Exploratory Tests`.
2. `Run workflow` sec.
3. `app_id=chatbotapp` birak.
4. Ilk kosumlarda `allow_generation=false` birak.
5. Headless kosum icin `headed=false` sec.
6. `Run workflow` ile baslat.
7. Once `npm run generate`, sonra Playwright test sonucunu kontrol et.
8. Artifact icinden once `artifacts/evidence/README.md` dosyasini ac.

## Sonuc Okuma

- `active-sprint.json`: Jira'dan okunan sprint snapshot'i
- `generated-cases.json`: uretilebilen smoke/exploratory/monkey case'leri
- `generated-cases.md`: ayni case'lerin lead icin okunabilir ozeti
- `code-intelligence.json`: lokal kaynak veya diff risk sinyalleri
- `playwright-report.json`: test sonucu ozeti
- `artifacts/evidence`: case isimli, okunabilir screenshot ve MP4 kanitlari
- `test-results`: ham Playwright test ciktilari ve trace dosyalari

## Triage Sirasi

1. Jira ve code intelligence adimi basarili mi?
2. Test fail'i assertion mi, runtime oracle mi?
3. Screenshot ve MP4 ayni case'in son durumunu gosteriyor mu?
4. Auth, environment URL, network veya test verisi false positive uretiyor olabilir mi?
5. Ayni seed ile tekrar kosum sonucu degisiyor mu?

## Guvenlik ve Etki

- Jira adapter'i read-only'dir.
- Generation aksiyonlari varsayilan olarak kapalidir.
- Monkey aksiyonlari seeded ve bounded'dir.
- Auth state sadece GitHub Secret veya lokal git disi dosya olarak kullanilir.
- Frontend repository'sine herhangi bir degisiklik yapilmaz.
