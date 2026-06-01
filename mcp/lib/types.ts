/**
 * types.ts — Effikit MCP Server'ın çekirdek tip sistemi.
 *
 * Tüm katmanlar (indexer → scorer → tools) bu tipler üzerinden konuşur.
 * Tek bir doğruluk kaynağı: bir dosya hakkında bilinen her şey `EffikitEntry`'de.
 */

/** Effikit'in beş üst düzey bölümü. Her bölümün farklı bir amacı var. */
export type EffikitSection = "craft" | "mind" | "skills" | "bridge" | "prompt";

/** Bir bölümün AI'ya ne sunduğunu açıklayan niyet etiketi. */
export type SectionIntent =
  | "code-to-adapt" // craft, mind — projeye kopyalanıp uyarlanacak kod
  | "behavior" // skills — Claude'un nasıl düşüneceği
  | "integration" // bridge — harici servis / MCP kullanımı
  | "template"; // prompt — yapıştırılacak hazır metin

/**
 * Bir effikit dosyasının tam künyesi.
 * Indexer her dosyayı bir kez okur, bunu üretir, bellekte tutar.
 */
export interface EffikitEntry {
  /** Repo köküne göre POSIX yolu, ör. "craft/auth/auth.token.ts" */
  readonly relativePath: string;
  /** Mutlak dosya yolu — read aşamasında kullanılır */
  readonly absolutePath: string;
  /** Üst bölüm: craft / mind / skills / bridge / prompt */
  readonly section: EffikitSection;
  /** Alt klasör, ör. "auth", "search", "frontend" */
  readonly group: string;
  /** Dosya adı uzantısız, ör. "auth.token" */
  readonly name: string;
  /** @keywords etiketinden çıkarılan, normalize edilmiş terimler */
  readonly keywords: readonly string[];
  /** @domain — dosyanın tek cümlelik tanımı */
  readonly domain: string;
  /** @use-when — bu dosyanın doğru seçim olduğu senaryo */
  readonly useWhen: string;
  /** @not-when — başka yere bakılması gereken durum */
  readonly notWhen: string;
  /** Ham içeriğin tamamı (read tool'u için; tarama sonrası serbest bırakılabilir) */
  readonly content: string;
  /** Karakter cinsinden boyut — bütçe/maliyet sezgisi için */
  readonly sizeChars: number;
  /** İçerikten türetilen, aranabilir sözcük kümesi (gövde sinyali) */
  readonly bodyTokens: ReadonlySet<string>;
}

/** Bir arama/navigasyon sonucundaki tek bir eşleşme. */
export interface ScoredMatch {
  readonly entry: EffikitEntry;
  /** 0..1 arası normalize edilmiş alaka skoru */
  readonly score: number;
  /** Skorun neden bu olduğunu açıklayan insan-okunur gerekçeler */
  readonly reasons: readonly string[];
}

/** Indexer'ın tüm effikit'i tarayıp ürettiği bellek-içi katalog. */
export interface EffikitIndex {
  readonly entries: readonly EffikitEntry[];
  /** keyword → o keyword'ü taşıyan dosyalar (ters indeks) */
  readonly keywordMap: ReadonlyMap<string, readonly EffikitEntry[]>;
  /** Bölüm bazında sayımlar */
  readonly stats: EffikitStats;
  /** Indeksin oluşturulduğu an (ms epoch) — cache invalidation için */
  readonly builtAt: number;
}

export interface SectionStat {
  readonly section: EffikitSection;
  readonly intent: SectionIntent;
  readonly groups: number;
  readonly files: number;
}

export interface EffikitStats {
  readonly totalFiles: number;
  readonly totalKeywords: number;
  readonly sections: readonly SectionStat[];
}
