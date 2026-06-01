/**
 * tokenizer.ts — Metin normalizasyonu ve tokenizasyon.
 *
 * Hem sorguları hem dosya gövdelerini aynı uzaya indirger ki
 * skorlama elmayla elmayı karşılaştırsın. camelCase ve dotted.path
 * tanımlayıcılarını da parçalara böler — "useProgressiveImage" araması
 * "progressive", "image" gövde token'larıyla eşleşebilsin diye.
 */

/**
 * Yazılım bağlamında bilgi taşımayan, indeks gürültüsü yaratan sözcükler.
 * Bilinçli olarak kısa tutuldu — agresif stop-word listesi gerçek
 * sinyali ("state", "cache", "type") boğar.
 */
const STOP_WORDS: ReadonlySet<string> = new Set([
  "the", "a", "an", "and", "or", "but", "for", "to", "of", "in", "on",
  "with", "is", "are", "be", "this", "that", "it", "as", "at", "by",
  "from", "into", "we", "i", "you", "your", "my", "our", "need", "want",
  "using", "use", "make", "build", "create", "get", "how", "do", "can",
]);

/** Tek harfli token'ları ve saf sayıları eler — neredeyse hep gürültü. */
function isMeaningful(token: string): boolean {
  if (token.length < 2) return false;
  if (/^\d+$/.test(token)) return false;
  return !STOP_WORDS.has(token);
}

/**
 * camelCase / PascalCase / dotted.path / kebab-case / snake_case
 * tanımlayıcılarını bileşen sözcüklerine böler.
 * "useProgressiveImage" → ["use","progressive","image"]
 * "auth.token" → ["auth","token"]
 */
function splitIdentifier(raw: string): string[] {
  return raw
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2") // camelCase sınırı
    .replace(/[._\-/]+/g, " ") // ayraçlar
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Serbest metni normalize token listesine indirger.
 * Sıra korunur (n-gram türetimi isteyen katmanlar için), tekrarlar korunur
 * (terim frekansı skorlamada sinyaldir).
 */
export function tokenize(text: string): string[] {
  const lowered = text.toLowerCase();
  const rawTokens = lowered.split(/[^a-z0-9._\-/]+/).filter(Boolean);

  const out: string[] = [];
  for (const raw of rawTokens) {
    // Hem bütünü hem parçalarını ekle: "auth.token" → auth.token, auth, token
    const whole = raw.replace(/^[._\-/]+|[._\-/]+$/g, "");
    if (isMeaningful(whole)) out.push(whole);
    for (const part of splitIdentifier(raw)) {
      if (isMeaningful(part)) out.push(part);
    }
  }
  return out;
}

/** Benzersiz token kümesi — gövde sinyali (varlık testi) için. */
export function tokenSet(text: string): Set<string> {
  return new Set(tokenize(text));
}

/**
 * İki token arasındaki normalize edilmiş Levenshtein benzerliği (0..1).
 * Yazım hatalarını ve tekil/çoğul varyasyonları tolere etmek için kullanılır
 * ("recomendation" → "recommendation", "caches" → "cache").
 * Eşik üstü eşleşmeler skorlamada kısmi kredi alır.
 */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 0 : 1 - dist / maxLen;
}

/** Klasik dinamik programlama Levenshtein mesafesi — O(a·b), tek satır bellekli. */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      // prev[j-1] kesinlikle tanımlı (döngü değişmezi); noUncheckedIndexedAccess için ?? 0
      curr[j] = Math.min(
        (curr[j - 1] ?? 0) + 1, // ekleme
        (prev[j] ?? 0) + 1, // silme
        (prev[j - 1] ?? 0) + cost // değiştirme
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length] ?? 0;
}
