# 🔧 EFFİKİT — İNŞA PROJESİ

## ÖNEMLİ: Bu Proje Nedir?
Sen şu an effikit'i inşa ediyorsun.
Effikit henüz tamamlanmamış, bu yüzden klonlama yapma.
Tüm çalışmayı bu repoya push et:
https://github.com/aistorystudio42-byte/effikit.git

Bana her zaman Türkçe yanıt ver. İstisnasız.
Ben bir vibe coder'ım. Teknik jargonu minimumda tut, sade konuş.
Önce sonucu göster, sonra açıkla.

---

## 📁 EFFİKİT DOSYA YAPISI

Effikit 5 ana bölümden oluşur. Her bölümün amacını ve içeriğini çok iyi anla.

```
effikit/
  README.md          ← GitHub repo tanıtım sayfası
  navigation.md      ← Claude Code'un iç rehberi
  keywords.md        ← Anahtar kelime → dosya eşleştirme motoru
  rules.md           ← Kullanım kuralları ve kontrol sistemi
  sync.ts            ← keywords.md otomatik güncelleme scripti
  LICENSE            ← MIT lisansı
  │
  ├── craft/         ← Hazır TypeScript kod kütüphaneleri
  ├── mind/          ← Hazır algoritma kütüphaneleri
  ├── skills/        ← Yapay zeka davranış yönergeleri (.md)
  ├── bridge/        ← MCP server bağlantı dosyaları
  └── prompt/        ← Hazır prompt şablonları
```

---

## 📦 CRAFT KLASÖRÜ — Hazır Kod Kütüphaneleri

Craft içindeki her dosya TypeScript kütüphanesidir.
Her klasörde 3 adet .ts dosyası bulunur.
Her dosyanın en başında @keywords, @domain, @use-when, @not-when etiketleri olmalıdır.
Dosyalar akademik kalitede, zekice yazılmış, gerçek projelerde kullanılabilir olmalıdır.
Yorum satırları Türkçe olmalıdır.

### craft/ Alt Klasörleri:

**craft/ui/** — Kullanıcı arayüzü bileşenleri
- ui.components.ts → Hazır React bileşenleri (card, modal, input, dropdown)
- ui.layout.ts → Grid sistemi, responsive yapı, container yönetimi
- ui.tokens.ts → Renk sistemi, tipografi ölçekleri, spacing değerleri

**craft/ux/** — Kullanıcı deneyimi sistemleri
- ux.interaction.ts → Gesture, drag-drop, tıklama ve dokunma sistemleri
- ux.feedback.ts → Loading, skeleton, hata ve başarı durumu yönetimi
- ux.accessibility.ts → ARIA, klavye navigasyonu, ekran okuyucu desteği

**craft/hooks/** — React hook kütüphanesi
- hooks.state.ts → Gelişmiş state yönetimi hook'ları
- hooks.async.ts → Fetch, loading, error, retry hook'ları
- hooks.lifecycle.ts → Mount, unmount, resize, intersection hook'ları

**craft/api/** — API iletişim katmanı
- api.request.ts → İstek yönetimi, header, timeout, interceptor
- api.error.ts → Hata yakalama, sınıflandırma ve yönetimi
- api.cache.ts → Önbellekleme, invalidation, stale-while-revalidate

**craft/db/** — Veritabanı işlem katmanı
- db.query.ts → Sorgu oluşturma, optimizasyon, parametre yönetimi
- db.schema.ts → Tablo ve model tanımları, tip güvenliği
- db.migration.ts → Migration oluşturma, versiyon ve rollback yönetimi

**craft/auth/** — Kimlik doğrulama sistemi
- auth.session.ts → Oturum yönetimi, yenileme, süre kontrolü
- auth.token.ts → JWT işlemleri, şifreleme, doğrulama
- auth.permission.ts → Rol tabanlı yetki, politika ve kural motoru

**craft/animation/** — Animasyon kütüphanesi
- animation.transition.ts → Sayfa ve bileşen geçiş animasyonları
- animation.micro.ts → Hover, tıklama, focus mikro etkileşimleri
- animation.scroll.ts → Scroll tabanlı animasyon ve parallax sistemleri

---

## 🧠 MIND KLASÖRÜ — Algoritma Kütüphanesi

Mind içindeki her dosya TypeScript ile yazılmış ileri seviye algoritmadır.
Her klasörde 3 adet .ts dosyası bulunur.
Algoritmalar gerçek dünya sistemlerinde kullanılabilir, akademik kalitede olmalıdır.
Karmaşık matematik ve fizik hesaplamaları içerebilir.
Yorum satırları algoritmanın mantığını açıklamalı, Türkçe olmalıdır.

### mind/ Alt Klasörleri:

**mind/recommendation/** — Öneri sistemi algoritmaları
- recommendation.engine.ts → Collaborative filtering, içerik tabanlı öneri motoru
- recommendation.scoring.ts → Ağırlıklı puanlama ve çok kriterli karar sistemi
- recommendation.filter.ts → Kural motoru, çıktı filtreleme ve çeşitlilik dengesi

**mind/discovery/** — Keşfet algoritmaları
- discovery.feed.ts → İçerik akışı yönetimi, sıralama ve sayfalama
- discovery.ranking.ts → Çok faktörlü sıralama ve öne çıkarma sistemi
- discovery.diversity.ts → Tekrar önleme ve içerik çeşitlilik dengesi

**mind/decision/** — Karar mekanizmaları
- decision.tree.ts → Karar ağacı yapısı ve traversal algoritması
- decision.weight.ts → Ağırlıklı öncelik ve çok kriterli karar sistemi
- decision.fallback.ts → Alternatif yol ve geri dönüş plan yöneticisi

**mind/optimization/** — Optimizasyon algoritmaları
- optimization.algorithm.ts → Genetik algoritma, simulated annealing, gradient descent
- optimization.cache.ts → Memoization, hesaplama önbellekleme stratejileri
- optimization.benchmark.ts → Performans ölçüm, karşılaştırma ve profiling

**mind/ranking/** — Sıralama sistemleri
- ranking.score.ts → ELO, TrueSkill, Bayesian ortalama puan hesaplama
- ranking.decay.ts → Zaman bazlı puan azalma ve güncelleme mekanizması
- ranking.boost.ts → Özel yükseltme kuralları ve öncelik motoru

**mind/search/** — Akıllı arama algoritmaları
- search.query.ts → Sorgu ayrıştırma, tokenizasyon ve normalizasyon
- search.fuzzy.ts → Levenshtein, Jaro-Winkler yakın eşleşme algoritmaları
- search.index.ts → Ters indeks yapısı ve hızlı erişim mekanizması

**mind/personalization/** — Kişiselleştirme sistemi
- personalization.profile.ts → Kullanıcı profili oluşturma ve güncelleme
- personalization.behavior.ts → Davranış takibi, örüntü analizi ve çıkarımı
- personalization.adapt.ts → Dinamik içerik uyarlama ve öğrenme sistemi

**mind/realtime/** — Gerçek zamanlı işlemler
- realtime.sync.ts → WebSocket tabanlı anlık senkronizasyon sistemi
- realtime.queue.ts → İşlem kuyruğu, öncelik ve retry yönetimi
- realtime.conflict.ts → Çakışma tespiti, çözüm ve merge stratejileri

**mind/graph/** — Graf algoritmaları
- graph.relation.ts → İlişki tanımlama, yönlü/yönsüz graf yapısı
- graph.traverse.ts → BFS, DFS, Dijkstra yol bulma algoritmaları
- graph.cluster.ts → Topluluk tespiti, gruplama ve kümeleme algoritmaları

**mind/caching/** — Önbellekleme stratejileri
- caching.strategy.ts → LRU, LFU, TTL tabanlı önbellekleme algoritmaları
- caching.invalidation.ts → Önbellek temizleme, bağımlılık ve kural motoru
- caching.layer.ts → Çok katmanlı önbellek mimarisi ve yönetimi

**mind/security/** — Güvenlik algoritmaları
- security.encrypt.ts → AES, RSA şifreleme ve çözme implementasyonları
- security.validate.ts → Girdi doğrulama, sanitizasyon ve güvenli ayrıştırma
- security.audit.ts → İz takibi, anomali tespiti ve denetim log sistemi

**mind/ai/** — Yapay zeka entegrasyon algoritmaları
- ai.prompt.ts → Prompt mühendisliği, şablon ve zincir yönetimi
- ai.context.ts → Bağlam penceresi yönetimi, özetleme ve hafıza sistemi
- ai.pipeline.ts → AI iş akışı, paralel işlem ve zincirleme sistemi

---

## 🎯 SKILLS KLASÖRÜ — Yapay Zeka Yönergeleri

Skills içindeki her dosya .md formatındadır.
Claude Code bu dosyaları okuyarak nasıl davranacağını öğrenir.
Her klasörde 4 adet .md dosyası bulunur.
Dosyalar çok detaylı, gerçekten işlevsel ve birbirinden farklı olmalıdır.

### skills/ Alt Klasörleri (20 adet):

**skills/frontend/** → React bileşen, stil, state ve performans yönergeleri
**skills/backend/** → Mimari, iş mantığı, ölçeklenebilirlik ve pattern yönergeleri
**skills/api/** → Endpoint tasarımı, validasyon, versiyonlama ve dokümantasyon
**skills/database/** → Modelleme, sorgu, migration ve optimizasyon yönergeleri
**skills/debugging/** → Hata bulma stratejisi, log analizi, araçlar ve yeniden üretme
**skills/security/** → Auth, girdi güvenliği, açık tarama ve denetim yönergeleri
**skills/testing/** → Unit, integration, e2e test ve kapsam yönergeleri
**skills/refactoring/** → Yeniden yapılandırma, pattern, isimlendirme ve temizleme
**skills/design/** → Tasarım sistemi, tipografi, renk ve responsive yönergeleri
**skills/ai/** → Prompt yazma, bağlam yönetimi, entegrasyon ve değerlendirme
**skills/devops/** → CI/CD, Docker, monitoring ve deployment yönergeleri
**skills/code-review/** → İnceleme kontrol listesi, geri bildirim, standartlar ve güvenlik
**skills/documentation/** → Kod yorumu, README, API ve changelog yönergeleri
**skills/architecture/** → Pattern, karar alma, diyagram ve mimari yönergeleri
**skills/performance/** → Frontend, backend, veritabanı optimizasyon ve izleme
**skills/accessibility/** → Semantik HTML, ARIA, klavye ve erişilebilirlik testi
**skills/creativity/** → Edison, Disney, Shakespeare ve Dali rollenme yönergeleri
**skills/art/** → Da Vinci, Beethoven, Picasso ve Michelangelo rollenme yönergeleri
**skills/science/** → Einstein, Newton, Feynman ve Tesla rollenme yönergeleri
**skills/performance-boost/** → Hız, odak, kalite ve iş akışı optimizasyon yönergeleri

---

## 🌉 BRIDGE KLASÖRÜ — MCP Bağlantıları

Bridge içindeki her klasör bir MCP server veya harici servis için özel talimatlar içerir.
Her klasörde o servise özel kullanım rehberi, örnek sorgular ve en iyi pratikler bulunur.

### bridge/ Alt Klasörleri (9 adet):

**bridge/github/** → Repo yönetimi, branch stratejisi, PR ve issue otomasyonu
**bridge/vercel/** → Deployment, environment, domain ve preview yönetimi
**bridge/supabase/** → Veritabanı, auth, storage ve realtime kullanım rehberi
**bridge/figma/** → Tasarım dosyası okuma, token ve bileşen çıkarma rehberi
**bridge/threjs/** → 3D sahne, fizik simülasyonu ve WebGL entegrasyon rehberi
**bridge/framermotion/** → Animasyon, gesture ve sayfa geçiş rehberi
**bridge/wolframalpha/** → Matematik, fizik hesaplama ve bilimsel sorgu rehberi
**bridge/shadcn/** → Bileşen kurulum, özelleştirme ve tema yönetimi rehberi
**bridge/gsap/** → Timeline, ScrollTrigger ve ileri seviye animasyon rehberi

---

## 💬 PROMPT KLASÖRÜ — Hazır Prompt Şablonları

Prompt içindeki her dosya .md formatında hazır, test edilmiş prompt şablonlarıdır.
Her klasörde 5 adet .md dosyası bulunur.
Promptlar gerçekten işe yarayan, detaylı ve bağlam zengin olmalıdır.

### prompt/ Alt Klasörleri (10 adet):

**prompt/code/** → Kod üretme, tamamlama ve geliştirme promptları
**prompt/debug/** → Hata bulma, analiz ve çözüm promptları
**prompt/review/** → Kod inceleme, kalite ve güvenlik analiz promptları
**prompt/architecture/** → Mimari tasarım, karar ve diyagram promptları
**prompt/planning/** → Proje planlama, sprint ve görev yönetimi promptları
**prompt/database/** → Veritabanı tasarım, sorgu ve optimizasyon promptları
**prompt/security/** → Güvenlik analizi, açık tarama ve denetim promptları
**prompt/performance/** → Performans analizi ve optimizasyon promptları
**prompt/design/** → UI/UX tasarım, sistem ve bileşen promptları
**prompt/ai/** → AI entegrasyon, prompt mühendisliği ve pipeline promptları

---

## ⚙️ TEMEL DOSYALAR

### navigation.md
Claude Code'un iç rehberidir. Hangi klasörde ne var, nereden başlanacak,
hangi durumda hangi bölüme gidilecek. Harita görevi görür.
Çok detaylı, net ve yönlendirici olmalıdır.

### keywords.md
Anahtar kelime → dosya eşleştirme motorudur.
Format şöyle olmalı:
- Her bölüm için anahtar kelimeler listelenir
- Karşısına direkt dosya yolu yazılır
- Claude bu dosyaya bakarak hangi dosyaya gideceğine karar verir
- Token israfını önlemek için kısa ve net tutulmalıdır

### rules.md
Effikit kullanım kuralları ve kontrol sistemidir.
Ne yapılmalı, ne yapılmamalı, hangi sıra takip edilmeli.
Bekçi görevi görür.

### sync.ts
Tüm craft, mind ve prompt klasörlerindeki dosyaların başındaki
@keywords etiketlerini okuyarak keywords.md'yi otomatik günceller.
Yeni dosya eklendiğinde çalıştırılır:
npx ts-node sync.ts

---

## 🚀 KALİTE STANDARTLARI

Her TypeScript dosyası için:
- Dosya başında @keywords, @domain, @use-when, @not-when etiketleri zorunludur
- Fonksiyonlar generic ve yeniden kullanılabilir olmalıdır
- Tip güvenliği maksimum seviyede olmalıdır
- Yorum satırları Türkçe ve açıklayıcı olmalıdır
- Gerçek dünya senaryolarından alınmış örnekler içermelidir
- Akademik kalitede ama pratik kullanıma uygun olmalıdır

Her Markdown dosyası için:
- Başlıklar net ve hiyerarşik olmalıdır
- Örnekler gerçek ve işlevsel olmalıdır
- Kısa ama öz tutulmalıdır, token israfı yapılmamalıdır
- Claude'un okuyunca direkt uygulayabileceği netlikte olmalıdır

---

## 📋 İNŞA PROTOKOLÜ

Effikit'i şu sırayla inşa et:

1. Önce temel dosyaları oluştur: navigation.md, keywords.md, rules.md, sync.ts
2. Sonra craft klasörünü tamamla
3. Sonra mind klasörünü tamamla
4. Sonra skills klasörünü tamamla
5. Sonra bridge klasörünü tamamla
6. Sonra prompt klasörünü tamamla
7. Son olarak README.md'yi yaz ve her şeyi GitHub'a push et

Her bölümü tamamladıktan sonra bana bildir ve onay al.
Hepsini bir anda yazmaya çalışma, bölüm bölüm ilerle.

---

## 🔄 GİTHUB

Repo adresi: https://github.com/aistorystudio42-byte/effikit.git

Tüm çalışmayı bu repoya push et.
Commit mesajları Türkçe ve açıklayıcı olsun.
Her bölüm tamamlandığında ayrı commit at.
