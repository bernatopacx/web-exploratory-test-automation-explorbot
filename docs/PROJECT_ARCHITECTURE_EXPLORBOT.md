# Web Exploratory Test Automation - Explorbot Entegrasyon Mimarisi

Bu dokuman, baseline projenin ustune Explorbot entegrasyonu geldikten sonra sistemin nasil calistigini anlatir. Iki repo bilerek ayri tutulur: baseline deterministic kosum icin, bu repo adaptive UI kesfini karsilastirmali PoC olarak kullanilir.

## 1. Baseline'dan farki

Baseline akisi:

```text
Jira + kod --> rule-based case generation --> Playwright probes --> evidence
```

Explorbot akisi:

```text
Jira + kod --> mission manifest --> Explorbot research/plan/execute
                                  --> adaptive browser exploration
                                  --> output + evidence + run summary
```

Baseline'daki Jira adapter'i, code intelligence ve rapor baglami korunur. Explorbot bu bilgilerin yerine gecmez; uygulama icinde daha esnek UI kesfi yapan ek motordur.

## 2. Uc katman

### A. Baglam ve risk katmani

Bu katman baseline ile aynidir:

- Jira aktif sprinti ve secilen issue'yi okur.
- Acceptance criteria ve issue metnini cikarir.
- Local development source tree veya diff okunur.
- navigation, async, share, responsive, modal gibi risk tag'leri uretilir.
- Deterministic smoke/exploratory/monkey case'leri uretilir.

### B. Mission katmani

`src/explorbot/mission.ts` bu girdileri `artifacts/explorbot/mission.json` dosyasinda birlestirir.

Mission su bilgileri tasir:

- uygulama ve base URL,
- hedef route/path,
- sprint ve Jira issue,
- acceptance criteria,
- code-derived risk tag'leri,
- uretilen case id'leri,
- maksimum test sayisi ve sure butcesi,
- izin verilen browser aksiyonlari,
- Jira read-only ve destructive action guardrail'leri.

Ornek CW-1819 mission kapsaminda:

- Issue: `CW-1819 - Share chat UI guncellemeleri`
- Acceptance criteria: 6 madde
- Riskler: share, responsive, async ve edge case
- Case'ler: `task-cw-1819-async`, `task-cw-1819-responsive`, `task-cw-1819-share`

### C. Explorbot runner

`src/explorbot/runner.ts` dis Explorbot CLI'sini kontrollu sekilde cagirir. Runner su kontrolleri yapar:

1. `EXPLORBOT_ENABLED=true` mi?
2. Acik bir `EXPLORBOT_TARGET_PATH` var mi?
3. `EXPLORBOT_AI_PROVIDER` tanimli mi?
4. Provider API key'i ortamda mevcut mu?

Bir kontrol eksikse dis browser agent'i baslatilmaz; `run-summary.json` icinde `skipped` nedeni yazilir.

## 3. Neden target path zorunlu?

Chatbot gibi authenticated ve dinamik route kullanan uygulamalarda base URL task'in gercek state'ini temsil etmeyebilir. Ana sayfa login, bos chat veya baska bir state gosterebilir.

Bu nedenle Explorbot'a task'in gercek development/staging hedefi acik verilir:

```bash
EXPLORBOT_TARGET_PATH=/chats/<seeded-chat-id>
```

Path bilinmiyorsa sistem rapor uretir ama kesfi baslatmaz. Boylece yanlis sayfayi kesfedip task basariliymis gibi raporlama riski azalir.

## 4. Knowledge dosyasi

`artifacts/explorbot/knowledge.md` mission'dan uretilir. Icerigi:

- objective,
- hedef URL ve path,
- Jira acceptance criteria,
- code-derived risk tag'leri,
- guvenlik kurallari.

Bu dosyaya credential, API token veya kullanici sifresi yazilmaz. Auth storage state ayri secret olarak verilir.

## 5. Local kosumlar

### A. Sadece mission ve baseline case'leri

AI provider cagirmadan baglami kontrol etmek icin:

```bash
JIRA_ISSUE_KEY=CW-1819 npm run generate
```

Kontrol edilecek dosyalar:

- `artifacts/task-cw-1819.html`,
- `artifacts/explorbot/mission.json`,
- `artifacts/explorbot/knowledge.md`.

### B. Explorbot adaptive kesfi

Once ayri repoda Explorbot kurulumu yapilir:

```bash
npm install explorbot --save-dev
npx playwright install chromium
```

Sonra development/staging route ve provider ile kosulur:

```bash
EXPLORBOT_ENABLED=true \
EXPLORBOT_TARGET_PATH=/chats/<seeded-chat-id> \
EXPLORBOT_AI_PROVIDER=openai \
JIRA_ISSUE_KEY=CW-1819 \
npm run explorbot:run
```

Provider API key local environment'ta tutulur; repoya commit edilmez.

## 6. GitHub Actions kosumu

Workflow'ta iki secenek vardir:

### Baseline modu

- `run_explorbot=false`
- deterministic Jira/code/case generation
- Playwright smoke, exploratory ve monkey testleri
- screenshot, video, trace ve HTML report

### Explorbot modu

- `run_explorbot=true`
- `issue_key=CW-1819` gibi task secimi
- `explorbot_target_path=/chats/<seeded-chat-id>`
- Explorbot paketinin workflow icinde kurulmasi
- mission uretimi ve adaptive kesif
- Explorbot stdout/stderr/run-summary artifact'i
- ayni kosumda baseline Playwright kanitlari

AI kosumu varsayilan olarak kapali tutulur. Bunun nedeni provider maliyeti, hassas browser verisinin AI prompt'una gidebilmesi ve authenticated uygulamalarda yanlis state riskidir.

## 7. Cikti klasoru

```text
artifacts/
  explorbot/
    mission.json
    knowledge.md
    run-summary.json
    output/
      stdout.log
      stderr.log
  task-cw-1819.html
  evidence/
playwright-report/
test-results/
```

`run-summary.json` su sorulara cevap verir:

- Kesif baslatildi mi?
- Skip olduysa neden?
- Hangi target path kullanildi?
- Hangi command calisti?
- Exit code neydi?
- Log dosyalari nerede?

## 8. Guvenlik ve operasyon

- Yalnizca development veya staging hedefi kullanilir.
- Disposable veya temizlenebilir test datasi tercih edilir.
- Jira tamamen read-only kalir.
- Jira issue, comment, status, assignee veya bug otomatik yazilmaz.
- Delete, publish, purchase, dis mesaj gonderme ve production mutation aksiyonlari kapali kabul edilir.
- Auth state ve provider key secret olarak tutulur.
- Browser'da gorunen verilerin log/artifact veya AI provider'a gidebilecegi varsayilir.

## 9. Insan kontrolu ve karar mekanizmasi

Explorbot ciktisi otomatik release karari degildir. Lead incelemesi su sirayla yapilir:

1. Mission dogru task ve acceptance criteria'yi mi tasiyor?
2. Target path gercekten task state'ine mi gidiyor?
3. Explorbot hangi sayfa state'lerini ve aksiyonlari denemis?
4. Screenshot/video/trace bulguyu gosterebiliyor mu?
5. Baseline Playwright testi ayni kosumda geciyor mu?
6. Bulguyu Jira bug'ina donusturmek gerekiyor mu?

Jira'ya yazma son adimi bilincli olarak insan onayinda birakilir.

## 10. Neyi cozer, neyi cozmez?

### Cozdugu kisimlar

- Sprint ve task baglamini browser kesfine tasir.
- Acceptance criteria ile risk tag'lerini tek mission'da toplar.
- UI state'leri, modal, navigation, responsive ve interruption akislarini daha adaptive kesfedebilir.
- Explorbot loglarini mevcut Playwright artifact'leriyle ayni kosumda toplar.
- Route bilinmiyorsa kosumu durdurup acik neden raporlar.

### Cozmedigi veya manuel biraktigi kisimlar

- Guvenli authenticated route seed etme.
- Provider API key ve maliyet yonetimi.
- Her acceptance criterion icin formal assertion garantisi.
- Production kosum guvencesi.
- Jira'ya otomatik bug acma karari.

## 11. Iki repo neden ayri?

Bu ayrim karsilastirma yapmayi kolaylastirir:

- Baseline repo her zaman deterministic referans olarak kalir.
- Explorbot repo adaptive kesfi opt-in olarak dener.
- Bir sprint veya task icin iki kosumun su metrikleri karsilastirilir:
  - acceptance criteria kapsami,
  - bulunan edge case sayisi,
  - false positive/false negative,
  - kosum suresi,
  - provider maliyeti,
  - lead'in kaniti okuyabilme kolayligi.

Sonuc olumluysa Explorbot runner ortak altyapiya alinabilir; degilse baseline repo kaybedilmeden kullanilmaya devam eder.
