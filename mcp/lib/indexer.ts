/**
 * indexer.ts — Effikit deposunu bellek-içi aranabilir bir katoloğa dönüştürür.
 *
 * Tasarım kararları:
 * - Tarama BİR KEZ yapılır, sonuç bellekte tutulur (mtime ile invalidate edilir).
 *   MCP server uzun ömürlü bir süreçtir; her sorguda disk taramak savurganlık olur.
 * - Hem .ts (craft/mind) hem .md (skills/bridge/prompt) etiket formatları okunur.
 *   sync.ts'in çıkarım mantığıyla bilinçli olarak uyumlu — tek doğruluk kaynağı.
 * - Ters indeks (keyword → entries) skorlayıcının O(1) aday toplamasını sağlar.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { tokenSet } from "./tokenizer.js";
import {
  assessCohesion,
  CohesionViolationError,
} from "./cohesion.js";
import type {
  EffikitEntry,
  EffikitIndex,
  EffikitSection,
  EffikitStats,
  SectionIntent,
  SectionStat,
  TagAuditFinding,
  TagAuditReport,
  TagDefect,
} from "./types.js";

/**
 * Hangi bölüm hangi uzantıyı taşır ve AI'ya hangi niyetle hizmet eder.
 * `fullTags`: bu bölümde @domain + @use-when etiketleri ZORUNLU mu?
 * craft/mind (kod) için evet — niyet katmanı kritik. skills/bridge/prompt (.md)
 * tasarımı gereği yalnızca @keywords taşır; orada @domain aramak yanlış pozitif olur.
 */
const SECTION_CONFIG: Record<
  EffikitSection,
  {
    readonly ext: ".ts" | ".md";
    readonly intent: SectionIntent;
    readonly fullTags: boolean;
  }
> = {
  craft: { ext: ".ts", intent: "code-to-adapt", fullTags: true },
  mind: { ext: ".ts", intent: "code-to-adapt", fullTags: true },
  skills: { ext: ".md", intent: "behavior", fullTags: false },
  bridge: { ext: ".md", intent: "integration", fullTags: false },
  prompt: { ext: ".md", intent: "template", fullTags: false },
};

const SECTIONS = Object.keys(SECTION_CONFIG) as EffikitSection[];

// ── Etiket çıkarım kalıpları ────────────────────────────────────────────────
// .ts:  // @keywords a, b, c        .md:  <!-- @keywords: a, b, c -->
const TS_TAG = {
  keywords: /@keywords\s+(.+)/,
  domain: /@domain\s+(.+)/,
  useWhen: /@use-when\s+(.+)/,
  notWhen: /@not-when\s+(.+)/,
} as const;

const MD_TAG = {
  keywords: /<!--\s*@keywords:\s*(.+?)\s*-->/,
  domain: /<!--\s*@domain:\s*(.+?)\s*-->/,
  useWhen: /<!--\s*@use-when:\s*(.+?)\s*-->/,
  notWhen: /<!--\s*@not-when:\s*(.+?)\s*-->/,
} as const;

function firstMatch(content: string, re: RegExp): string {
  const m = content.match(re);
  return m && m[1] ? m[1].trim() : "";
}

function parseKeywords(raw: string): string[] {
  return raw
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);
}

/** Bir bölümün dosyalarını özyinelemeli tarar ve EffikitEntry'lere dönüştürür. */
function scanSection(
  root: string,
  section: EffikitSection
): EffikitEntry[] {
  const sectionDir = path.join(root, section);
  if (!fs.existsSync(sectionDir)) return [];

  const { ext } = SECTION_CONFIG[section];
  const isMd = ext === ".md";
  const tagSet = isMd ? MD_TAG : TS_TAG;
  const entries: EffikitEntry[] = [];

  const walk = (dir: string): void => {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) {
        walk(full);
      } else if (item.isFile() && item.name.endsWith(ext)) {
        const content = fs.readFileSync(full, "utf-8");
        const keywords = parseKeywords(firstMatch(content, tagSet.keywords));
        if (keywords.length === 0) continue; // etiketsiz dosya indekslenmez

        const relativePath = path
          .relative(root, full)
          .replace(/\\/g, "/");
        const parts = relativePath.split("/");
        const group = parts[1] ?? section;
        const fileName = parts[parts.length - 1] ?? item.name;
        const name = fileName.replace(/\.(ts|md)$/, "");

        const domain = firstMatch(content, tagSet.domain) || name;
        const useWhen = firstMatch(content, tagSet.useWhen);
        const notWhen = firstMatch(content, tagSet.notWhen);

        // Gövde sinyali: keyword + domain + useWhen + dosya adı + içerik başlığı.
        // Tüm içeriği token'lamak pahalı ve gürültülü; en sinyalli kısımları alıyoruz.
        const signalText = [
          keywords.join(" "),
          domain,
          useWhen,
          name,
          content.slice(0, 1200), // dosya başı: başlık + ilk açıklama bloğu
        ].join(" ");

        entries.push({
          relativePath,
          absolutePath: full,
          section,
          group,
          name,
          keywords,
          domain,
          useWhen,
          notWhen,
          content,
          sizeChars: content.length,
          bodyTokens: tokenSet(signalText),
        });
      }
    }
  };

  walk(sectionDir);
  return entries;
}

/** keyword → entries ters indeksi kurar. */
function buildKeywordMap(
  entries: readonly EffikitEntry[]
): Map<string, EffikitEntry[]> {
  const map = new Map<string, EffikitEntry[]>();
  for (const entry of entries) {
    for (const kw of entry.keywords) {
      const bucket = map.get(kw);
      if (bucket) bucket.push(entry);
      else map.set(kw, [entry]);
    }
  }
  return map;
}

function computeStats(entries: readonly EffikitEntry[]): EffikitStats {
  const sections: SectionStat[] = SECTIONS.map((section) => {
    const inSection = entries.filter((e) => e.section === section);
    const groups = new Set(inSection.map((e) => e.group));
    return {
      section,
      intent: SECTION_CONFIG[section].intent,
      groups: groups.size,
      files: inSection.length,
    };
  });

  const allKeywords = new Set<string>();
  for (const e of entries) for (const k of e.keywords) allKeywords.add(k);

  return {
    totalFiles: entries.length,
    totalKeywords: allKeywords.size,
    sections,
  };
}

/** Effikit kökünü tam tarar ve değişmez bir indeks döndürür. */
/**
 * Effikit kökünü tam tarar ve değişmez bir indeks döndürür.
 *
 * `enforce` (varsayılan true): Bütünlük Bütçesi sert eşiğini aşan bir klasör
 * varsa CohesionViolationError fırlatır → server BAŞLAMAYI REDDEDER. "Koda
 * gömülü engelleme" budur: sınırsız büyüme effikit'i çalışmaz hale getirir.
 * Yalnızca raporlama amaçlı çağrılarda (audit) enforce=false geçilir; o zaman
 * ihlaller hata yerine rapora bilgi olarak yansır.
 */
export function buildIndex(root: string, enforce = true): EffikitIndex {
  const entries: EffikitEntry[] = [];
  for (const section of SECTIONS) {
    entries.push(...scanSection(root, section));
  }

  // ── Bütünlük Bütçesi: koda gömülü, dereceli büyüme koruması ──────────────
  // Sağlıklı/uyarı klasörler sorunsuz geçer; yalnızca SERT eşiği aşan klasör
  // build'i durdurur. Eşikler deponun gerçek dağılımına göre kalibre edildi.
  const cohesion = assessCohesion(entries);
  if (enforce && cohesion.violations > 0) {
    throw new CohesionViolationError(cohesion);
  }

  return {
    entries,
    keywordMap: buildKeywordMap(entries),
    stats: computeStats(entries),
    builtAt: Date.now(),
  };
}

// ── Etiket denetimi ──────────────────────────────────────────────────────────
/**
 * Tek bir dosyanın etiket sağlığını ölçer.
 * Indeksleme etiketsiz dosyayı sessizce atladığı için (scanSection'daki
 * `continue`), o sessiz boşluğu burada görünür kılıyoruz: dosya AI tarafından
 * bulunamıyorsa bunu yutmak yerine kusur olarak raporluyoruz.
 */
function auditFile(
  content: string,
  relativePath: string,
  section: EffikitSection,
  tagSet: typeof TS_TAG | typeof MD_TAG,
  fullTags: boolean
): TagAuditFinding | null {
  const rawKeywords = firstMatch(content, tagSet.keywords);
  const keywords = parseKeywords(rawKeywords);
  const hasKeywordTag = content.match(tagSet.keywords) !== null;

  const defects: TagDefect[] = [];

  // En ağır kusur önce: dosya hiç indekslenemiyor mu?
  if (keywords.length === 0) {
    // Etiket satırı hiç yok mu, yoksa var ama içi boş mu? Ayrı dertler.
    defects.push(hasKeywordTag ? "empty-keywords" : "missing-keywords");
  } else if (keywords.length === 1) {
    // Tek keyword: çoğu zaman kopyala-yapıştır kalıntısı veya aceleci etiket.
    // İndekslenir ama erişilebilirliği zayıf — uyarı seviyesi.
    defects.push("thin-keywords");
  }

  // Niyet katmanı yalnızca craft/mind (kod) için zorunlu. skills/bridge/prompt
  // tasarımı gereği sadece @keywords taşır — orada @domain aramak yanlış pozitif.
  if (fullTags) {
    if (!firstMatch(content, tagSet.domain)) defects.push("missing-domain");
    if (!firstMatch(content, tagSet.useWhen)) defects.push("missing-use-when");
  }

  if (defects.length === 0) return null; // sağlıklı dosya — rapora girmez

  return {
    relativePath,
    section,
    defects,
    indexable: keywords.length > 0,
  };
}

/** Bir bölümü etiket sağlığı açısından tarar; yalnızca kusurlu dosyaları döndürür. */
function auditSection(
  root: string,
  section: EffikitSection
): { scanned: number; findings: TagAuditFinding[] } {
  const sectionDir = path.join(root, section);
  if (!fs.existsSync(sectionDir)) return { scanned: 0, findings: [] };

  const { ext, fullTags } = SECTION_CONFIG[section];
  const tagSet = ext === ".md" ? MD_TAG : TS_TAG;
  const findings: TagAuditFinding[] = [];
  let scanned = 0;

  const walk = (dir: string): void => {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) {
        walk(full);
      } else if (item.isFile() && item.name.endsWith(ext)) {
        scanned++;
        const content = fs.readFileSync(full, "utf-8");
        const relativePath = path.relative(root, full).replace(/\\/g, "/");
        const finding = auditFile(content, relativePath, section, tagSet, fullTags);
        if (finding) findings.push(finding);
      }
    }
  };

  walk(sectionDir);
  return { scanned, findings };
}

/**
 * Tüm effikit deposunu etiket sağlığı açısından denetler.
 *
 * "İnsan unutur" eleştirisinin doğrudan cevabı: sistem, unutulan veya bozuk
 * etiketleri kendisi yakalar ve raporlar — disipline güvenmek yerine.
 * En ağır kusurlar (indekslenemeyen dosyalar) önce sıralanır.
 */
export function auditTags(root: string): TagAuditReport {
  const allFindings: TagAuditFinding[] = [];
  let filesScanned = 0;

  for (const section of SECTIONS) {
    const { scanned, findings } = auditSection(root, section);
    filesScanned += scanned;
    allFindings.push(...findings);
  }

  const unindexable = allFindings.filter((f) => !f.indexable).length;
  const warnings = allFindings.length - unindexable;

  // İndekslenemeyenler en üstte: AI'nın asla göremeyeceği dosyalar en kritik.
  allFindings.sort((a, b) => Number(a.indexable) - Number(b.indexable));

  return {
    filesScanned,
    healthy: filesScanned - allFindings.length,
    unindexable,
    warnings,
    findings: allFindings,
  };
}

/**
 * Bütünlük Bütçesi raporunu ENFORCE ETMEDEN üretir (audit/raporlama için).
 * buildIndex sert ihlalde fırlatır; bu fonksiyon fırlatmaz, böylece ihlal
 * olsa bile rapor görüntülenebilir ve kullanıcı neyi böleceğini görür.
 */
export function reportCohesion(root: string) {
  // enforce=false: ihlal varsa bile build çökmesin, entries'i alalım.
  const index = buildIndex(root, false);
  return assessCohesion(index.entries);
}

/**
 * Önbellekli indeks sağlayıcı.
 * Tarama maliyetini amortize eder; deponun en güncel mtime'ı değişirse
 * (yeni dosya, düzenleme) otomatik yeniden tarar. MCP server'ı yeniden
 * başlatmaya gerek kalmaz.
 */
export class IndexCache {
  private cached: EffikitIndex | null = null;
  private lastSignature = "";

  constructor(private readonly root: string) {}

  /** Dizin ağacındaki en yeni mtime'ı tarar — ucuz değişiklik imzası. */
  private signature(): string {
    let newest = 0;
    const visit = (dir: string): void => {
      if (!fs.existsSync(dir)) return;
      for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, item.name);
        if (item.isDirectory()) {
          visit(full);
        } else {
          const m = fs.statSync(full).mtimeMs;
          if (m > newest) newest = m;
        }
      }
    };
    for (const s of SECTIONS) visit(path.join(this.root, s));
    return String(newest);
  }

  get(): EffikitIndex {
    const sig = this.signature();
    if (this.cached && sig === this.lastSignature) return this.cached;
    this.cached = buildIndex(this.root);
    this.lastSignature = sig;
    return this.cached;
  }
}
