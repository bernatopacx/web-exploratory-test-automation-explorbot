# Explorbot Entegrasyon Isletim Modeli

Bu repo, mevcut sprint tabanli Playwright altyapisinin ayri bir kopyasidir. Amac, iki modeli karsilastirabilmektir:

- **Baseline repo:** Deterministic Jira + code intelligence + Playwright smoke/monkey kosumu.
- **Bu repo:** Baseline'a ek olarak, Jira ve koddan uretilen mission'i Explorbot'a vererek adaptive UI kesfi.

## 1. Hangi katman ne yapiyor?

### Orkestrasyon katmani

`src/jira/`, `src/code-intelligence/` ve `src/cases/` ayni sorumlulugu korur:

- aktif sprinti ve secilen Jira maddesini okur,
- acceptance criteria ve risk sinyallerini cikarir,
- mevcut development source tree diff'ini okur,
- task veya sprint bazli case seti uretir.

### Mission katmani

`src/explorbot/mission.ts` bu baglami `artifacts/explorbot/mission.json` icinde tek bir sozlesmeye donusturur. Mission icinde:

- hedef uygulama ve path,
- Jira sprint ve issue bilgisi,
- acceptance criteria,
- code intelligence riskleri,
- uretilen case id'leri,
- test butcesi,
- guvenlik kurallari bulunur.

`artifacts/explorbot/knowledge.md` Explorbot'a verilecek okunabilir baglamdir. Sirlar ve credential'lar bu dosyaya yazilmaz.

### Explorbot runner

`src/explorbot/runner.ts` dis CLI'yi kontrollu sekilde cagirir. Guvenlik icin kosum su kosullari saglamalidir:

1. `EXPLORBOT_ENABLED=true`
2. `EXPLORBOT_TARGET_PATH` veya app profilinde bir target path
3. `EXPLORBOT_AI_PROVIDER`
4. Desteklenen provider API key'i

Bunlardan biri yoksa kosum baslatilmaz ve `run-summary.json` icine neden `skipped` oldugu yazilir.

## 2. Neden target path zorunlu?

Chatbot gibi uygulamalarda ana sayfa, login veya bos state task'in gercek akisina denk gelmeyebilir. Explorbot'a sadece base URL vermek, task'a ait olmayan bir sayfanin kesfedilmesine yol acar. Bu nedenle dinamik veya authenticated route'lar icin kullanici acik bir path vermelidir:

```bash
EXPLORBOT_TARGET_PATH=/chats/<seeded-chat-id>
```

Bu bilgi bilinmiyorsa mission uretilir ama runner guvenli sekilde kosumu atlar. Bu, yanlis pozitif raporlamadan daha yararlidir.

## 3. Local kosum

### Sadece mission ve rapor

```bash
JIRA_ISSUE_KEY=CW-1819 npm run generate
```

Bu adim AI cagirmadan task raporu ve Explorbot mission'i uretir.

### AI-assisted kesif

```bash
EXPLORBOT_ENABLED=true \
EXPLORBOT_TARGET_PATH=/chats/<seeded-chat-id> \
EXPLORBOT_AI_PROVIDER=openai \
JIRA_ISSUE_KEY=CW-1819 \
npm run explorbot:run
```

Ilk kurulum ayri repoda yapilir:

```bash
npm install explorbot --save-dev
npx playwright install chromium
```

## 4. GitHub Actions kosumu

Workflow girdileri:

- `app_id`: uygulama profili,
- `issue_key`: tek Jira maddesine odaklanma,
- `run_explorbot`: varsayilan `false`,
- `explorbot_target_path`: Explorbot'un gezecegi acik path,
- `headed`: Playwright ekran kaydi icin sanal display secenegi.

`run_explorbot=false` iken mevcut baseline kosar. `true` iken workflow ayri olarak Explorbot paketini kurar, mission'i yeniden uretir ve output loglarini artifact'e ekler.

## 5. Kanit ve karar

Bu entegrasyon Explorbot'un kararini tek basina release karari yapmaz. Lead incelemesinde su sirayla bakilir:

1. `mission.json`: dogru Jira maddesi, criteria ve target path var mi?
2. `run-summary.json`: gercekten kosmus mu, yoksa guvenlik nedeniyle skip mi?
3. `stdout.log` ve Explorbot output: hangi state'ler ve aksiyonlar denenmis?
4. Playwright screenshot/video/trace: bulgu tekrarlanabilir mi?
5. Baseline test sonucu: ayni kosumda deterministik smoke testi geciyor mu?

Explorbot'un bulgusu once kanit olarak raporlanir. Jira'ya otomatik issue veya comment yazilmaz; bug acma karari insan onayindadir.

## 6. Kapsam ve riskler

- Sadece development/staging ve disposable test datasi kullanilmalidir.
- Provider API kullanimi ek maliyet dogurabilir.
- Browser'da gorunen hassas veriler AI prompt'una veya artifact'e gidebilir; test hesabi ve veri izolasyonu gerekir.
- Explorbot lisansi ve provider kosullari sirket icinde incelenmeden managed service gibi paketlenmemelidir.

## 7. Karsilastirma karari

Bu kopya, iki haftalik veya tek tasklik PoC icin uygundur. Sonuc kriterleri:

- task acceptance criteria'nin kac tanesi gercek browser state'i ile coverlandi,
- uretilen kanitlar lead tarafindan okunabiliyor mu,
- false positive/false negative orani,
- kosum suresi ve API maliyeti,
- route/auth/safety operasyonu ne kadar manuel.

Bu kriterler olumluysa Explorbot runner'i ortak altyapiya alinabilir. Olumsuzsa ilk repo deterministic baseline olarak tutulur.
