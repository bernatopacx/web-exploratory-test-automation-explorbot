# OKR Teslim Raporu

## 1. Yonetici Ozeti

Bu calisma, herhangi bir web uygulamasi icin Jira sprint baglamini ve uygulama kaynak kodu risklerini kullanarak smoke, exploratory ve bounded monkey testleri uretebilen tekrar kullanilabilir bir Playwright altyapisi ortaya cikarmistir.

Chatbot App profili ile yapilan son dogrulama kosumunda:

- Jira `CW` projesinin `CW Sprint 35` sprintinden 411 issue okundu.
- Jira metni ve test risk boyutlarindan 10 otomatik case uretildi.
- 13 Playwright testi calisti ve 13'u basarili oldu.
- Test suiti 28.2 saniyede tamamlandi; workflow toplam suresi yaklasik 1 dakika 49 saniyeydi.
- Screenshot, MP4, WebM, trace, JSON raporu ve sprint snapshot'i artifact olarak yuklendi.
- Kullanici tarafindan okunabilir 12 screenshot + 12 MP4 kaniti `artifacts/evidence` altinda toplandi.

Son dogrulama: 24 Eylul 2026, workflow run #14.

## 2. OKR Ile Iliskisi

### Amac

Sprint bazli gelistirmelerde manuel kesif testinin kapsamini, tekrar edilebilirligini ve raporlanabilirligini artirmak.

### Teslim edilen sonuc

Tek bir uygulamaya ozel test scriptleri yerine, uygulama profilini degistirerek farkli web uygulamalarinda calisabilecek ortak bir test motoru olusturuldu.

### Olcumler

| Olcum | Sonuc |
| --- | --- |
| Jira sprint entegrasyonu | Aktif sprint ve issue listesi okunuyor |
| Jira yazma etkisi | Yok; adapter read-only |
| Risk tabanli case uretimi | 10 case |
| Smoke + exploratory + monkey | 13/13 basarili |
| CI kaniti | Screenshot, MP4, WebM, trace, JSON |
| Lokal code intelligence | 999 kaynak dosyasi, 8 risk sinyali |
| Uygulama profili | `chatbotapp` |
| Lokalizasyon | Bu fazda kapsam disi |

## 3. Sistem Ne Yapiyor?

Calisma akisi su siradadir:

1. `apps/<app-id>.json` uygulama profilini yukler.
2. Jira board uzerinden aktif sprinti bulur.
3. Sprint issue'larini read-only REST API ile okur.
4. Issue summary, description, type, status, priority ve label alanlarindan risk sinyali cikarir.
5. Lokal frontend kaynaginda git diff varsa degisen dosyalari; ZIP veya git metadata yoksa kaynak agacini tarar.
6. Navigation, async, image, input, modal, persistence, responsive ve auth gibi risk boyutlarini case charter'larina cevirir.
7. Smoke, exploratory ve seeded monkey testlerini Playwright ile calistirir.
8. Screenshot, video, trace, JSON raporu, sprint snapshot'i ve code intelligence ciktisini artifact olarak yukler.

## 4. Case Uretim Modeli

Case'ler acceptance criterion'lari birebir assertion'a cevirmiyor. Amac, gelistirmenin etrafindaki kirilma risklerini kesfetmek.

- `navigation`: hizli menu gecisleri, route ve state korunumu
- `async`: devam eden response sirasinda context degistirme
- `image`: image generation ve preview durumlarinin korunmasi
- `input`: focus, yazili metin ve klavye davranisi
- `modal`: Escape, dis alana tiklama ve overlay davranisi
- `persistence`: refresh, back/forward ve yeni session gecisleri
- `responsive`: viewport sinirlari ve kritik kontrollerin erisilebilirligi
- `auth`: auth sonlanmasi veya interruption sonrasinda recoverability

Her kosumda smoke ve bounded monkey baseline kontrolleri korunur. Yeni sprint riskleri mevcut baseline'in uzerine eklenir; sistem sadece yeni maddeleri degil, tum etkilenebilecek risk boyutlarini tekrar kontrol eder.

## 5. Jira Siniri

Bu surumde Jira sadece girdi kaynagidir.

Okunanlar:

- Aktif sprint
- Issue key ve summary
- Description ve acceptance criteria metni
- Issue type, status, priority ve labels

Jira'ya yazilmayanlar:

- Issue olusturma
- Comment ekleme
- Status veya assignee degistirme
- Test case yazma
- Sonuc guncelleme

Sonuclar GitHub Actions artifact'i ve lokal kanit klasoru olarak uretilir.

## 6. Code Intelligence Durumu

Lokal frontend kaynagi:

`work/extract/fe-chatbot-main/src/v2`

Lokal taramada 999 kaynak dosyasi ve su 8 risk sinyali bulundu:

`navigation`, `async`, `image`, `responsive`, `auth`, `persistence`, `modal`, `input`

CI workflow'u su an frontend repository'sini checkout etmiyor. Bu, kullanicinin istegi dogrultusunda code intelligence'in lokal kaynak uzerinden tutulmasi nedeniyle beklenen davranistir. Bu nedenle CI logunda `Code intelligence: unavailable` gorunur; bu test hatasi degildir. Lokal analiz ciktisi `artifacts/code-intelligence.json` dosyasinda tutulur.

## 7. Son Kosum Kaniti

- Workflow: [Sprint Exploratory Tests #14](https://github.com/bernatopacx/web-exploratory-test-automation/actions/runs/36019490974)
- Artifact: [exploratory-test-results](https://github.com/bernatopacx/web-exploratory-test-automation/actions/runs/36019490974/artifacts/10815698869)
- Commit: `5f65d04`
- Sprint: `CW Sprint 35`
- Uygulama: `https://chat.chatbotapp.ai`

Artifact icinde hem Playwright'in ham ciktisi hem de daha kolay incelenen `artifacts/evidence` klasoru bulunur. Evidence klasoru case isimleriyle eslesen screenshot ve MP4 dosyalarini icerir.

## 8. Karsilasilan Sorunlar ve Alinan Aksiyonlar

### Jira ag hatalari

503, ECONNRESET ve response body timeout durumlari goruldu. Jira istemcisine istek timeout'u, body timeout'u ve sinirli retry mekanizmasi eklendi.

### Jira pagination dongusu

Jira'nin `nextPageToken` degeri sonraki istege aktarilmiyordu. Bu, generate adiminin uzun sure takilmasina neden oluyordu. Pagination token aktarimi ve tekrar eden token korumasi eklendi.

### Ucuncu taraf konsol mesaji

Google Identity Services kaynakli `Provider's accounts list is empty.` mesaji uygulama hatasi gibi yakalaniyordu. Lokal kaynak incelemesi sonrasi sadece chatbotapp profiline dar kapsamli ignore pattern eklendi; diger page error ve console error'lar hala fail sebebidir.

Lokal headed kosumda ayni Google Identity Services entegrasyonunun `FedCM get() rejects with NetworkError: Error retrieving a token.` mesaji de goruldu. Bu mesaj da sadece chatbotapp profilindeki dar ignore listesine eklendi; diger page error ve console error'lar hala fail sebebidir.

### Kanit formatlari

WebM dosyalarinin bazi masaustu oynaticilarda bos gorunmesi uzerine sistem FFmpeg ile MP4 donusumu eklendi. Ayrica hash isimli Playwright data dosyalari yerine case isimli `artifacts/evidence` klasoru olusturuldu.

## 9. Run Oncesi Gerekenler

GitHub Secrets:

- `JIRA_BASE_URL`
- `JIRA_EMAIL`
- `JIRA_API_TOKEN`
- `AUTH_STORAGE_STATE_B64` (authenticated surface test edilecekse)

Workflow parametreleri:

- `app_id`: uygulama profili
- `allow_generation`: quota veya maliyetli aksiyonlar icin bilincli olarak `true`
- `headed`: sanal ekranli kosum icin `true`, normal headless kosum icin `false`

## 10. Sinirlar ve Sonraki Faz

Mevcut teslimat MVP seviyesinde kullanilabilir durumdadir. Asagidaki maddeler sonraki faz adaylaridir:

1. Frontend repository'sini CI icinde guvenli sekilde checkout ederek gercek development diff'ini workflow'a dahil etmek.
2. Gecerli test hesabi storage state'i ile authenticated journey kapsamlarini artirmak.
3. Test case ve sonuc ozetini Jira'ya yazma opsiyonunu ayri bir opt-in mod olarak eklemek.
4. Uygulama profili icin daha zengin domain action adapter'lari eklemek.
5. Lokalizasyon testlerini ayri bir faz olarak etkinlestirmek.
6. Evidence klasorune otomatik HTML index ve case basina risk/issue eslesmesi eklemek.

## 11. Teslimat Icerigi

- Kaynak kod ve Playwright test altyapisi
- Jira adapter'i ve sprint case generator'u
- Lokal code intelligence analyzer'i
- Chatbot App uygulama profili
- GitHub Actions workflow'u
- `docs/OPERATING_MODEL.md`
- Bu OKR raporu
- Handoff ve run checklist dokumani
- Son kosum artifact ve okunabilir evidence klasoru
