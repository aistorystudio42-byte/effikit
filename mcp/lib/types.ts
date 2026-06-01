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

// ── Etiket denetimi (tag audit) ──────────────────────────────────────────────
// "İnsan unutur" sorununun panzehiri: indeksleme etiketsiz dosyayı sessizce
// atlar (indexer.ts'teki `continue`). Audit katmanı o sessiz boşluğu görünür
// kılar — sistem, unutulan etiketi kendisi yakalar ve raporlar.

/** Bir dosyanın etiket sağlığında saptanan tek bir kusur. */
export type TagDefect =
  /** @keywords hiç yok — dosya indekslenemez, AI bu dosyayı asla bulamaz */
  | "missing-keywords"
  /** @keywords var ama boş/yalnız virgül — etiket gövdesi anlamsız */
  | "empty-keywords"
  /** @domain yok — dosyanın tek cümlelik tanımı eksik */
  | "missing-domain"
  /** @use-when yok — "ne zaman seçilmeli" sinyali eksik */
  | "missing-use-when"
  /** Tek bir keyword'e bağlı — kopyala-yapıştır şüphesi, zayıf erişilebilirlik */
  | "thin-keywords";

/** Tek bir dosyanın denetim bulgusu. */
export interface TagAuditFinding {
  readonly relativePath: string;
  readonly section: EffikitSection;
  /** En ağırdan en hafife sıralı kusur listesi */
  readonly defects: readonly TagDefect[];
  /** indekslenebilir mi? (en az bir geçerli keyword var mı) */
  readonly indexable: boolean;
}

/** Tüm depo için toplu etiket sağlık raporu. */
export interface TagAuditReport {
  /** Taranan toplam dosya sayısı (uzantı eşleşen her dosya) */
  readonly filesScanned: number;
  /** Etiketi eksiksiz, kusursuz dosya sayısı */
  readonly healthy: number;
  /** @keywords yokluğundan indekslenemeyen — AI'nın asla göremeyeceği dosyalar */
  readonly unindexable: number;
  /** İndekslenir ama bir uyarı taşıyan dosya sayısı */
  readonly warnings: number;
  /** Yalnızca kusurlu dosyalar; sağlıklılar listede yer almaz */
  readonly findings: readonly TagAuditFinding[];
}
