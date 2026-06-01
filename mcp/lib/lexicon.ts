/**
 * lexicon.ts — Kavram köprüsü: kullanıcı dilini effikit keyword diline çevirir.
 *
 * İki gerçek problemi çözer:
 *
 *   1. ÇOK DİLLİLİK. Kullanıcı (bu projede) Türkçe görev tanımlar:
 *      "kullanıcı girişi", "oturum", "arama kutusu". Ama effikit keyword'leri
 *      İngilizce: "login", "session", "search". Köprü olmadan skorlayıcı bu
 *      sorguları asla doğru dosyaya bağlayamaz.
 *
 *   2. EŞ ANLAMLILIK. "memoize" ≈ "cache", "auth" ≈ "authentication",
 *      "spinner" ≈ "loading". Kullanıcı hangi sözcüğü seçerse seçsin aynı
 *      dosyaya varmalı.
 *
 * Tasarım: yön-bağımsız eşdeğerlik kümeleri. Bir küme içindeki HERHANGİ bir
 * terim sorguda görülürse, kümedeki TÜM terimler sorguya genişletilir.
 * Böylece çeviri tek yönlü değil, simetriktir — hem TR→EN hem EN→TR çalışır.
 */

/**
 * Her satır bir eşdeğerlik kümesidir. Küme içi terimler aynı kavramı işaret eder.
 * Türkçe sözcükler bilinçli olarak İngilizce karşılıklarıyla aynı kümede.
 * Liste küratörlüdür: yalnızca effikit'te gerçekten keyword olan kavramlar.
 */
const EQUIVALENCE_SETS: ReadonlyArray<readonly string[]> = [
  // ── Kimlik & yetki ──────────────────────────────────────────────────────
  ["login", "signin", "giriş", "oturum açma", "kullanıcı girişi"],
  ["logout", "signout", "çıkış"],
  ["session", "oturum", "session yönetimi"],
  ["auth", "authentication", "kimlik doğrulama", "doğrulama", "yetkilendirme"],
  ["authorization", "permission", "rbac", "yetki", "izin", "rol"],
  ["token", "jwt", "jeton", "access token", "refresh token", "yenileme"],
  ["user", "kullanıcı", "account", "hesap"],

  // ── Arama & eşleşme ──────────────────────────────────────────────────────
  ["search", "arama", "ara", "sorgu", "query"],
  ["fuzzy", "typo", "yazım hatası", "yaklaşık", "approximate"],
  ["index", "indeks", "inverted index", "ters indeks"],
  ["filter", "filtre", "filtreleme", "eleme"],

  // ── UI / etkileşim ───────────────────────────────────────────────────────
  ["component", "bileşen", "ui", "arayüz"],
  ["modal", "dialog", "popup", "açılır pencere"],
  ["button", "buton", "düğme"],
  ["form", "input", "form", "girdi", "alan"],
  ["dropdown", "select", "açılır menü", "menü"],
  ["layout", "grid", "yerleşim", "düzen", "responsive", "duyarlı"],
  ["scroll", "kaydırma", "infinite scroll", "sonsuz kaydırma"],
  ["drag", "drop", "sürükle", "bırak", "gesture", "jest", "hareket"],
  ["loading", "spinner", "skeleton", "yükleniyor", "bekleme"],
  ["toast", "notification", "bildirim", "uyarı"],
  ["animation", "transition", "animasyon", "geçiş", "motion", "hareket"],

  // ── Veri & ağ ────────────────────────────────────────────────────────────
  ["api", "request", "fetch", "istek", "http"],
  ["error", "hata", "exception", "istisna"],
  ["retry", "tekrar deneme", "yeniden dene", "backoff"],
  ["cache", "caching", "memoize", "önbellek", "önbellekleme"],
  ["database", "db", "veritabanı", "sql", "query"],
  ["schema", "model", "şema", "tablo"],
  ["migration", "migrasyon", "rollback", "versiyon"],

  // ── Akıllı sistemler (mind) ──────────────────────────────────────────────
  ["recommendation", "recommend", "öneri", "tavsiye", "suggest"],
  ["ranking", "rank", "sıralama", "puanlama", "score", "skor"],
  ["feed", "discovery", "akış", "keşfet", "keşif"],
  ["personalization", "kişiselleştirme", "profil", "behavior", "davranış"],
  ["realtime", "websocket", "gerçek zamanlı", "anlık", "canlı"],
  ["graph", "graf", "ilişki", "relation", "network", "ağ"],
  ["optimization", "optimize", "optimizasyon", "genetic", "genetik"],
  ["encrypt", "encryption", "şifreleme", "kripto", "crypto", "aes", "rsa"],
  ["validate", "validation", "doğrulama", "sanitize", "temizleme"],

  // ── AI ───────────────────────────────────────────────────────────────────
  ["prompt", "istem", "prompt engineering"],
  ["context", "bağlam", "context window", "memory", "hafıza"],
  ["pipeline", "iş akışı", "akış", "chain", "zincir"],

  // ── Medya ──────────────────────────────────────────────────────────────────
  ["image", "görsel", "resim", "lazy load", "tembel yükleme", "blur"],
  ["video", "video", "autoplay", "otomatik oynatma"],
  ["audio", "ses", "web audio", "visualizer", "görselleştirici"],

  // ── Davranış / süreç (skills) ────────────────────────────────────────────
  ["security", "güvenlik", "vulnerability", "açık", "zafiyet"],
  ["refactor", "refactoring", "yeniden yapılandırma", "temizleme", "cleanup"],
  ["debug", "debugging", "hata ayıklama", "sorun giderme", "diagnose"],
  ["test", "testing", "test", "unit", "integration", "e2e"],
  ["review", "code review", "inceleme", "kod incelemesi"],
  ["performance", "performans", "hız", "speed", "optimize"],
  ["accessibility", "erişilebilirlik", "aria", "a11y"],
  ["architecture", "mimari", "pattern", "tasarım deseni"],
  ["typescript", "ts", "tip", "type", "generic", "jenerik"],
];

/**
 * Sorgu token'ı → genişletilmiş eşdeğer terim kümesi.
 * Tek bir token sözlükte birden çok kümeye düşebilir (ör. "query" hem
 * arama hem veritabanı kümesinde); hepsi birleştirilir.
 */
function buildExpansionMap(): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const set of EQUIVALENCE_SETS) {
    for (const term of set) {
      // Çok sözcüklü Türkçe terimleri ("kullanıcı girişi") tek tek sözcükleriyle
      // de anahtarla ki tek sözcüklük sorgular da köprüyü tetikleyebilsin.
      const keys = [term, ...term.split(/\s+/)];
      for (const key of keys) {
        const bucket = map.get(key) ?? new Set<string>();
        for (const t of set) bucket.add(t);
        map.set(key, bucket);
      }
    }
  }
  return map;
}

const EXPANSION_MAP = buildExpansionMap();

/**
 * Bir token listesini eşdeğer terimlerle genişletir.
 * Orijinal token'lar korunur; yalnızca yeni eşdeğerler eklenir.
 * Genişletilmiş terimler "yardımcı" olarak işaretlenir — skorlayıcı bunlara
 * tam token kadar değil, indirimli ağırlık verir (köprü, kanıt değildir).
 */
export interface ExpandedQuery {
  /** Kullanıcının yazdığı orijinal token'lar */
  readonly primary: ReadonlySet<string>;
  /** Köprüyle eklenen eşdeğer token'lar (orijinalde olmayanlar) */
  readonly bridged: ReadonlySet<string>;
}

export function expandQuery(tokens: readonly string[]): ExpandedQuery {
  const primary = new Set(tokens);
  const bridged = new Set<string>();

  // Hem tek token'ları hem de bitişik ikili (bigram) ifadeleri köprüde ara —
  // "kullanıcı girişi" gibi çok sözcüklü kavramları yakalamak için.
  const probes = new Set<string>(tokens);
  for (let i = 0; i < tokens.length - 1; i++) {
    probes.add(`${tokens[i]} ${tokens[i + 1]}`);
  }

  for (const probe of probes) {
    const expansions = EXPANSION_MAP.get(probe);
    if (!expansions) continue;
    for (const term of expansions) {
      // Çok sözcüklü eşdeğeri tek sözcüklerine indir (skorlayıcı tek token bekler).
      for (const word of term.split(/\s+/)) {
        if (!primary.has(word)) bridged.add(word);
      }
    }
  }

  return { primary, bridged };
}
