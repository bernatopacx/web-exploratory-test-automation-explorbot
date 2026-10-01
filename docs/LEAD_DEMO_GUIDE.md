# Lead Demo Rehberi

Bu demo, sistemi kod incelemesi yaptirmadan 10-15 dakika icinde anlatmak icin kullanilir.

## Demo Ciktisi

Lead'in su dort soruya cevap almis olmasi hedeflenir:

1. Sistem hangi girdileri okuyor?
2. Bu girdiler nasil test case risklerine donusuyor?
3. Testler uygulamada nasil kosuyor?
4. Sonuc ve kanit nasil raporlaniyor?

## Ekran Sirasi

### 1. Problem ve cozum - 1 dakika

Su cumleyle basla:

> Her sprintte Jira maddelerini ve degisen kodu okuyup, acceptance criterion'i birebir otomatiklestirmek yerine gelistirmenin etrafindaki kirilma risklerini smoke, exploratory ve bounded monkey case'lerine ceviriyoruz.

Ardindan kapsam sinirini soyle:

- Jira read-only kullaniliyor.
- Frontend repository'sine degisiklik yapilmiyor.
- Lokalizasyon bu fazda kapsam disi.
- Generation aksiyonlari varsayilan olarak kapali.

### 2. Uygulama profili - 1 dakika

`apps/chatbotapp.json` dosyasini ac.

Su alanlari goster:

- uygulama URL'i
- Jira project key ve board id
- smoke icin temel locator'lar
- uygulamanin destekledigi risk yuzeyleri

Vurgulanacak nokta: Yeni uygulama icin test motoru degismez; profil degisir.

### 3. Jira girdisi - 2 dakika

GitHub Actions ekraninda `Run workflow` sec.

- `app_id=chatbotapp`
- `allow_generation=false`
- `headed=false`

Tek taski gostermek istersen ayni ekranda opsiyonel `issue_key` alanina `CW-1819` gir. Bu alan bos birakilirsa sprint geneli raporu uretilir.

Workflow'un once `npm run generate` calistirdigini anlat. Bu adim:

- aktif sprinti bulur
- issue'lari okur
- summary, description, acceptance criteria, issue type, priority ve label alanlarini risk sinyallerine cevirir
- `artifacts/active-sprint.json` ve `artifacts/generated-cases.json` dosyalarini uretir

Jira'ya issue, comment, status veya assignee yazilmaz.

### 4. Code intelligence - 2 dakika

Lokal frontend kaynaginin `SOURCE_REPO_PATH` ile okundugunu goster.

Su ayrimi acikla:

- Git checkout varsa development diff'i okunur.
- ZIP veya git metadata yoksa kaynak agaci taranir.
- Kaynak koddan navigation, async, image, responsive, auth, persistence, modal ve input riskleri cikarilir.

Bu nedenle case'ler sadece Jira metnine degil, uygulamanin gercek degisiklik yuzeyine de dayanir.

### 5. Uretilen case'ler - 2 dakika

`artifacts/generated-cases.json` dosyasini ac ve 2-3 case goster.

Task odakli demo icin bunun yerine `artifacts/task-cw-1819.html` dosyasini ac. Bu raporda task basligi, Jira linki, acceptance criteria ve sadece tasktan uretilen case'ler bulunur.

Ornek anlatim:

- Response devam ederken sol menude gezinme: async state ve recoverability
- Image generation devam ederken yeni chat acma: interruption ve state persistence
- Focus degistirme ve uzun input: input state ve interaction continuity
- Rastgele ama sinirli tiklamalar: monkey baseline

Bunlar feature acceptance testleri degil; feature'in etrafindaki kirilma risklerini yoklayan charters'tir.

### 6. Browser kosumu - 3 dakika

Lead'e browser'i canli gostermek icin lokal kosum kullan:

```bash
HEADED=true npm test
```

Bu kosumda browser gorunur, test sonunda screenshot, video ve trace uretilir.

GitHub Actions tarafinda fiziksel browser penceresi kullanilmaz. `headed=true` sanal ekran ile kosar; bu nedenle ekran kaydi ve screenshot artifact olarak alinir.

Browser'i lead'e acik tutarak gostermek icin sadece ilk smoke testini kontrollu duraklat:

```bash
DEMO_PAUSE=true PWDEBUG=1 HEADED=true npm run test:smoke
```

Inspector acildiginda yesil Play ile ilk `page.goto` adimini ilerlet. Uygulama ve primary input gorundugunde test `page.pause()` noktasinda bekler; bu asamada browser'i lead'e gosterebilirsin. Demo bittiginde Inspector'daki Play ile devam edip testi kapat.

### 7. Kanit ve sonuc - 2 dakika

Once su dosyayi ac:

`artifacts/evidence/README.md`

Ardindan bir case'in PNG ve MP4 dosyasini ac. Su cumleyi kullan:

> Her case'in sonucu sadece pass/fail olarak degil, son ekran goruntusu ve tam kosum kaydi ile incelenebilir. Ham trace ve JSON ciktisi da ayni artifact icindedir.

Son olarak basarili kosumu goster:

- 13/13 test basarili
- 10 risk bazli case
- 411 Jira issue snapshot'i
- screenshot, MP4, WebM, trace ve JSON artifact'leri

## Canli Demo Komutlari

```bash
cp .env.example .env
npm install
npx playwright install chromium
npm run typecheck

SOURCE_REPO_PATH=work/extract/fe-chatbot-main/src/v2 \
SOURCE_REPO=hubxco/fe-chatbot \
npm run generate

HEADED=true npm test
```

Lokal kosumdan sonra raporu acmak icin:

```bash
npx playwright show-report
```

## Demo Sirasinda Soylenmemesi Gereken Yanlis Beklentiler

- Bu bir full regression suite degil.
- Her acceptance criterion otomatik assertion'a donusturulmuyor.
- Jira'ya otomatik test case veya bug yazilmiyor.
- CI icinde lokal frontend repository'si otomatik checkout edilmiyor; mevcut fazda code intelligence lokal kaynakla besleniyor.

## Kapanis Cumlesi

> Bu MVP'nin degeri tek tek test scriptleri yazmak degil; her sprintte Jira baglamini, kod riskini ve uygulama davranisini ayni kosumda birlestirip incelenebilir kanit uretebilmesi.

## Explorbot Varyantini Gosterme

Bu kopyada baseline akisinin ustune adaptive UI kesfi eklenmistir. Once AI olmadan mission uretimini goster:

```bash
JIRA_ISSUE_KEY=CW-1819 npm run generate
open artifacts/explorbot/mission.json
```

Lead'e su noktayi goster: mission icinde CW-1819 acceptance criteria, `share/responsive/async` riskleri, code intelligence sonucu ve guvenlik kurallari birlikte bulunur.

Chatbot App icin hedef route dynamic ve authenticated oldugu icin path'i bilmeden AI kesfi baslatilmaz. Dev/staging'de seed edilmis bir chat route'u verildiginde:

```bash
EXPLORBOT_ENABLED=true \
EXPLORBOT_TARGET_PATH=/chats/<seeded-chat-id> \
EXPLORBOT_AI_PROVIDER=openai \
JIRA_ISSUE_KEY=CW-1819 \
npm run explorbot:run
```

`EXPLORBOT_ENABLED=false` veya path/provider eksikse kosum baslatilmaz; bunun yerine `artifacts/explorbot/run-summary.json` icinde neden `skipped` oldugu gorulur. Bu, iki varyanti maliyet ve risk acisindan karsilastirmak icin bilincli bir kontrol noktasi.

Actions demosunda `run_explorbot=false` baseline icin, `true` ise AI-assisted kosum icin kullanilir. `issue_key=CW-1819` ve `explorbot_target_path` birlikte verilmelidir. AI provider key'i GitHub secret olarak tutulur; repoya veya knowledge dosyasina yazilmaz.
