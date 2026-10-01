# Kesif Test Otomasyonu Isletim Modeli

Bu proje, herhangi bir web uygulamasi icin Jira sprint maddeleri ve uygulamanin development branch diff'inden smoke, exploratory ve bounded monkey testleri ureten ortak bir Playwright altyapisidir.

## 1. Uygulama ile Jira eslesmesi

Her uygulama `apps/<app-id>.json` dosyasi ile tanimlanir.

Ornek `chatbotapp` profili:

- Uygulama: `https://chat.chatbotapp.ai`
- Jira proje anahtari: `CW`
- Jira board: `362`
- Semantic locator bilgileri: ana input, sidebar ve gonderme kontrolleri
- Capability listesi: chat, images, documents, apps, projects ve search
- Kaynak kodu: lokal `fe-chatbot` projesi; git checkout varsa development diff'i, ZIP ise local source tree taramasi

Baska uygulama eklemek icin mevcut profile kopyalanir. Ortak Jira adapter'i ve Playwright motoru degismez.

## 2. Jira'dan ne okunur?

Calisma basladiginda adapter su sirayla okur:

1. Board'daki aktif sprinti bulur.
2. Aktif sprintin proje maddelerini JQL ile listeler.
3. Her madde icin issue key, summary, description, issue type, status, priority ve labels alanlarini alir.
4. Acceptance criteria dahil aciklama metnini risk sinyali cikarmak icin kullanir.
5. Sprint snapshot'ini `artifacts/active-sprint.json` dosyasina yazar.
6. Lokal kaynak uygulamayi okur; git varsa diff, ZIP ise source tree taramasi yapar ve risk sinyallerini `artifacts/code-intelligence.json` dosyasina yazar.

Board Agile endpoint'i kullanilamazsa adapter, proje anahtariyla `sprint in openSprints()` fallback sorgusuna duser.

## 3. Jira'ya ne yazilir?

Mevcut surum Jira'ya hicbir sey yazmaz.

- Issue olusturmaz.
- Issue guncellemez.
- Comment eklemez.
- Status veya assignee degistirmez.
- Test case'i Jira'ya kaydetmez.

Jira bu surumde sadece kaynak gereksinim ve sprint baglami olarak kullanilir. Tum test sonucu GitHub Actions artifact'i olarak uretilir.

## 4. Case nasil olusur?

`src/cases/generator.ts` Jira metnini ve `src/code-intelligence/analyzer.ts` development diff'ini risk sinyallerine cevirir. Ornek sinyaller:

- navigation / menu / route -> hizli gezinme ve state korunumu
- loading / response / generation -> in-flight interruption
- image / preview / erase -> image state ve preview kurtarma
- input / focus / keyboard -> focus ve typed text kaybi
- modal / warning -> Escape, outside click ve overlay kontrolu
- memory / history / persist -> refresh, back/forward ve persistence
- responsive / viewport -> breakpoint ve tasma kontrolu
- login / logout / password -> auth recovery

Kod tarafinda path ve degisen satirlar birlikte okunur. Ornegin `router`, `navigate`, `fetch`, `modal`, `localStorage`, `input` veya `image` kullanan degisiklikler ilgili risk charter'ini tetikler. ZIP senaryosunda dosyanin mevcut icerigi taranir. Case, hangi Jira maddelerinden ve hangi kod dosyalarindan geldigini tasir.

Her aktif sprint icin iki baseline case de eklenir:

- Smoke: uygulama aciliyor ve ana etkilesim yuzeyi gorunuyor mu?
- Monkey: seeded ve limitli rastgele guvenli etkilesimler uygulamayi bozuyor mu?

Case'ler `artifacts/generated-cases.json` icine yazilir. Case'ler feature implementation assertion'i yerine risk, state, recoverability ve runtime oracle odaklidir.

### Task bazli uretim

Tek bir Jira maddesine odaklanmak icin `JIRA_ISSUE_KEY` verilir:

```bash
JIRA_ISSUE_KEY=CW-1819 npm run generate
JIRA_ISSUE_KEY=CW-1819 npm test
```

Bu mod sprint raporunu silmez; ek olarak `artifacts/task-cw-1819.json`, `.md` ve `.html` dosyalarini uretir. Task raporu issue'nin summary, description, status, priority, acceptance criteria ve kod risklerini tasir. Task anahtari test kosumu sirasinda set edilmisse generated test inventory task JSON'ini kullanir.

## 5. Hangi test neyi kontrol eder?

### Smoke

Her uygulamada calisan minimum saglik kontrolleridir:

- base URL aciliyor mu?
- fatal page error var mi?
- primary input veya giris kontrolu gorunuyor mu?
- input focus degisiminden sonra marker kayboluyor mu?

### Exploratory

Jira sprint metninden secilen risk boyutlarini dener:

- navigation: hizli menu gecisleri ve geri donus
- async: loading sirasinda context degistirme
- image: image sonucu ve interruption
- modal: close, Escape, outside click ve focus
- persistence: refresh, history, back/forward

Localization bu fazda bilincli olarak kapsam disidir; Jira metninde gecse bile case uretilmez.

### Monkey

Feature assertion'i yerine bounded stability taramasidir:

- seeded random kullanir
- maksimum action sayisi vardir
- maksimum sure limiti vardir
- sadece safe path allow-list icinde kalir
- generation aksiyonlari varsayilan olarak kapatilir
- console error, page error ve blank page oracle'lari izlenir

## 6. Run oncesi kullanicidan beklenenler

### Zorunlu

GitHub Repository Secrets:

- `JIRA_BASE_URL`: `https://mobilex.atlassian.net`
- `JIRA_EMAIL`: Jira hesap e-postasi
- `JIRA_API_TOKEN`: Jira API token
- `AUTH_STORAGE_STATE_B64`: auth gerektiren uygulama icin base64 Playwright storage state

GitHub Repository Variables icin varsayilanlar profilde oldugu icin ilk kosumda ek bir variable zorunlu degildir. Farkli uygulama icin su degerler degistirilebilir:

- `APP_ID`
- `APP_BASE_URL`
- `JIRA_PROJECT_KEY`
- `JIRA_BOARD_ID`
- `SOURCE_REPO_PATH`: lokal `fe-chatbot` klasoru

### Auth gerektiren uygulamalar

Auth-protected surface icin test hesabi ile Playwright storage state olusturup base64 olarak `AUTH_STORAGE_STATE_B64` secret'ina eklemek gerekir. Bu dosya repoya commit edilmez.

### Run secimi

Manuel workflow baslatirken:

- `app_id`: ilgili app profile id
- `allow_generation`: ilk kosumda `false`
- `headed`: CI'da sanal ekranli kosum icin `true`, normal headless kosum icin `false`
- `issue_key`: taska ozel rapor icin Jira key; ornegin `CW-1819`

Generation quota veya maliyet etkisi olan image/LLM aksiyonlari ancak bilerek `true` yapildiginda acilir.

## 7. Run esnasinda kullanicidan beklenenler

Normal kosumda kullanicinin aksiyon almasi gerekmez. GitHub Actions su adimlari kendi yapar:

1. Node ve npm kurar.
2. Playwright Chromium ve Linux bagimliliklarini kurar.
3. TypeScript typecheck calistirir.
4. Kaynak uygulamanin development branch'ini checkout eder ve diff'i analiz eder.
5. Opsiyonel auth state'i hazirlar.
6. Jira aktif sprintini okur.
7. Case document'i uretir.
8. Smoke ve generated testleri calistirir.
9. Report, trace, screenshot, video, code intelligence ve sprint snapshot'ini artifact olarak yukler.

Kullanici sadece secret eksikse, auth state suresi dolmussa, ortam URL'si degismisse veya generation testini bilerek acacaksa devreye girer.

## 8. Run sonrasi kontrol

Ilk kontrol sirasi:

1. `generate` adimi basarili mi?
2. `active-sprint.json` icinde dogru sprint ve issue sayisi var mi?
3. `generated-cases.json` icinde smoke ve monkey baseline case'leri var mi?
4. Hata hangi case ve oracle'da cikmis?
5. Playwright trace veya screenshot ile UI durumu inceleniyor mu?

Bir hata urun bug'i olarak raporlanmadan once ayni seed ile tekrar kosulmali ve auth, ortam, network ve test data kaynakli false positive'ler ayrilmalidir.

## 9. Ilk Chatbot App kosumu

1. `JIRA_API_TOKEN`, `JIRA_EMAIL`, `JIRA_BASE_URL` secret'larini kontrol et.
2. Actions -> `Sprint Exploratory Tests` -> `Run workflow` ac.
3. Branch olarak `main` sec.
4. `app_id=chatbotapp` birak.
5. `allow_generation=false` birak.
6. `headed=false` birak.
7. `Run workflow` ile baslat.
8. Ilk olarak `Run npm run generate` adimini kontrol et.
9. Sonra smoke ve generated test sonucunu, artifact icindeki screenshot/video/trace'i incele.

Taska ozel kosum icin `issue_key=CW-1819` gir. Artifact icinde `artifacts/task-cw-1819.html` dosyasini ac; bu dosya sprint genel raporundan farkli olarak tek taskin acceptance criteria ve risk case'lerini gosterir.

Bu akista `CW` board 362 ve `https://chat.chatbotapp.ai` profilden gelir; kullanicinin tekrar yazmasi gerekmez.
