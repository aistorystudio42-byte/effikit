/**
 * scorer.ts — Effikit'in alaka düzeyi motoru.
 *
 * Tasarım felsefesi: bir sorgunun bir dosyaya alakası tek sinyalden gelmez.
 * Ortogonal sinyalleri ağırlıklı birleştiririz:
 *
 *   1. Tam keyword isabeti       (en güçlü — küratörlü sinyal)
 *   2. Köprülü keyword isabeti    (TR↔EN + eş anlamlı; indirimli — köprü kanıt değil)
 *   3. Fuzzy keyword isabeti      (yazım/çekim toleransı, kısmi kredi)
 *   4. IDF ağırlığı               (nadir keyword > yaygın keyword — BM25 sezgisi)
 *   5. Gövde token örtüşmesi      (etiket kaçırsa bile içerik yakalar)
 *   6. Niyet/bölüm uyumu          (kullanıcı bölüm ima ettiyse düzeltici)
 *
 * İKİ KRİTİK İLKE:
 *
 *   A) ÇOK-TOKEN KEYWORD CEZASI. "fuzzy search" keyword'ünün sorguda yalnızca
 *      "search" geçmesi TAM isabet sayılmaz; eşleşen token oranıyla orantılı
 *      kredi verilir. Aksi halde tek yaygın sözcük dosyayı yapay olarak zirveye
 *      taşır (gözlemlenen kusur buydu).
 *
 *   B) MUTLAK SKOR + NORMALİZASYON AYRIMI. Önce ham (mutlak) skor hesaplanır ve
 *      mutlak bir tabanın (FLOOR) altındakiler ELENİR. Görüntüleme yüzdesi ayrıca
 *      en yüksek skora göre normalize edilir. Böylece "tek zayıf isabet → %100"
 *      yanılsaması ortadan kalkar: zayıf mutlak skor önce elenince zirveye çıkamaz.
 */

import { expandQuery } from "./lexicon.js";
import { similarity, tokenize } from "./tokenizer.js";
import type { EffikitEntry, EffikitIndex, ScoredMatch } from "./types.js";

const WEIGHTS = {
  exactKeyword: 1.0,
  bridgedKeyword: 0.5, // köprü ile eşleşen keyword — indirimli
  fuzzyKeyword: 0.4,
  idfBonus: 0.55,
  bodyOverlap: 0.3,
  intentMatch: 0.25,
} as const;

const FUZZY_THRESHOLD = 0.84;

/**
 * Mutlak ham skor tabanı. Bir entry'nin yarışa girebilmesi için en az bunu
 * toplaması gerekir. ~exactKeyword * 0.45: yani en az "yarım güçlü isabet"
 * değerinde gerçek bir sinyal şart. Saf gövde-örtüşmesi gürültüsü bunu geçemez.
 */
const ABSOLUTE_FLOOR = 0.45;

function idf(keyword: string, index: EffikitIndex): number {
  const df = index.keywordMap.get(keyword)?.length ?? 0;
  if (df === 0) return 0;
  return Math.log((index.entries.length + 1) / df);
}

function maxIdf(index: EffikitIndex): number {
  return Math.log(index.entries.length + 1);
}

interface QueryContext {
  readonly tokens: readonly string[];
  readonly primary: ReadonlySet<string>;
  readonly bridged: ReadonlySet<string>;
  /** primary ∪ bridged — hızlı varlık testi için */
  readonly all: ReadonlySet<string>;
  readonly hintedSection?: string;
}

function buildQueryContext(query: string): QueryContext {
  const tokens = tokenize(query);
  const { primary, bridged } = expandQuery(tokens);
  const all = new Set<string>([...primary, ...bridged]);

  const lowered = query.toLowerCase();
  const sectionNames = ["craft", "mind", "skills", "bridge", "prompt"];
  const hintedSection = sectionNames.find((s) => lowered.includes(s));

  return { tokens, primary, bridged, all, hintedSection };
}

/**
 * Bir keyword'ün sorguya isabet derecesini hesaplar.
 * Dönüş: { coverage: 0..1, viaBridge: boolean }
 *   - coverage: keyword'ün token'larından kaçı sorguda var (oran)
 *   - viaBridge: eşleşme yalnızca köprülü (eş anlamlı/TR-EN) terimlerle mi sağlandı
 * Tek-token keyword için coverage 0 veya 1; çok-token için kısmi olabilir.
 */
function keywordCoverage(
  keyword: string,
  ctx: QueryContext
): { coverage: number; viaBridge: boolean } {
  const kwTokens = tokenize(keyword);
  if (kwTokens.length === 0) return { coverage: 0, viaBridge: false };

  let primaryHits = 0;
  let bridgedHits = 0;
  for (const t of kwTokens) {
    if (ctx.primary.has(t)) primaryHits++;
    else if (ctx.bridged.has(t)) bridgedHits++;
  }

  const total = primaryHits + bridgedHits;
  if (total === 0) return { coverage: 0, viaBridge: false };

  return {
    coverage: total / kwTokens.length,
    // Hiç primary isabet yoksa eşleşme tamamen köprüye dayanıyor demektir.
    viaBridge: primaryHits === 0,
  };
}

function scoreEntry(
  entry: EffikitEntry,
  ctx: QueryContext,
  index: EffikitIndex
): { raw: number; reasons: string[] } {
  const reasons: string[] = [];
  let raw = 0;
  const idfCeiling = maxIdf(index) || 1;

  // ── Keyword isabetleri (tam / köprülü, çok-token cezalı) ──────────────────
  const exactHits: string[] = [];
  const bridgedHits: string[] = [];

  for (const kw of entry.keywords) {
    const { coverage, viaBridge } = keywordCoverage(kw, ctx);
    if (coverage === 0) continue;

    const idfValue = idf(kw, index);
    const idfFactor = idfValue / idfCeiling;

    if (viaBridge) {
      // Köprülü eşleşme: indirimli, yine de coverage ile orantılı.
      raw += WEIGHTS.bridgedKeyword * coverage;
      raw += WEIGHTS.idfBonus * idfFactor * coverage * 0.5;
      bridgedHits.push(kw);
    } else {
      // Tam (primary) eşleşme: coverage ile çarpılır — kısmi token kısmi kredi.
      raw += WEIGHTS.exactKeyword * coverage;
      raw += WEIGHTS.idfBonus * idfFactor * coverage;
      exactHits.push(coverage < 1 ? `${kw}(${Math.round(coverage * 100)}%)` : kw);
    }
  }

  if (exactHits.length > 0) {
    reasons.push(`keyword isabeti: ${exactHits.slice(0, 4).join(", ")}`);
  }
  if (bridgedHits.length > 0) {
    reasons.push(`köprülü eşleşme (TR↔EN/eş anlamlı): ${bridgedHits.slice(0, 3).join(", ")}`);
  }

  // ── Fuzzy isabet (tam/köprülü eşleşmeyen keyword'ler için) ────────────────
  // Tek "best" yerine TÜM fuzzy isabetleri toplarız: çok sözcüklü bir sorgunun
  // ("recomendation engin") her sözcüğü ayrı bir keyword'e yakınsa hepsi kredi
  // almalı. IDF ile ağırlıklanır — nadir keyword'e fuzzy isabet daha değerli.
  // Keyword token düzeyinde karşılaştırırız ki "recommendation engine" gibi çok
  // sözcüklü keyword'ler de yakalanabilsin.
  const alreadyMatched = new Set([...exactHits, ...bridgedHits]);
  const fuzzyTerms: string[] = [];
  for (const kw of entry.keywords) {
    if (alreadyMatched.has(kw)) continue;
    const kwTokens = tokenize(kw);
    if (kwTokens.length === 0) continue;

    let kwBest = 0;
    let kwBestTerm = "";
    for (const kt of kwTokens) {
      for (const qt of ctx.primary) {
        const sim = similarity(qt, kt);
        if (sim >= FUZZY_THRESHOLD && sim > kwBest) {
          kwBest = sim;
          kwBestTerm = `${qt}≈${kt}`;
        }
      }
    }
    if (kwBest > 0) {
      const idfFactor = idf(kw, index) / idfCeiling;
      raw += WEIGHTS.fuzzyKeyword * kwBest;
      raw += WEIGHTS.idfBonus * idfFactor * kwBest * 0.6;
      fuzzyTerms.push(kwBestTerm);
    }
  }
  if (fuzzyTerms.length > 0) {
    reasons.push(`yakın eşleşme: ${fuzzyTerms.slice(0, 3).join(", ")}`);
  }

  // ── Gövde token örtüşmesi (yalnızca primary token'lar; köprü gövdede sayılmaz) ──
  let bodyHits = 0;
  for (const qt of ctx.primary) {
    if (entry.bodyTokens.has(qt)) bodyHits++;
  }
  if (bodyHits > 0 && ctx.primary.size > 0) {
    const coverage = bodyHits / ctx.primary.size;
    raw += WEIGHTS.bodyOverlap * coverage;
    if (exactHits.length === 0 && bridgedHits.length === 0) {
      reasons.push(`içerik örtüşmesi: ${bodyHits} terim dosya gövdesinde`);
    }
  }

  // ── Niyet/bölüm uyumu ──────────────────────────────────────────────────────
  if (ctx.hintedSection && entry.section === ctx.hintedSection) {
    raw += WEIGHTS.intentMatch;
    reasons.push(`bölüm uyumu: ${entry.section}`);
  }

  return { raw, reasons };
}

/**
 * Sorguyu tüm indekse karşı çalıştırır.
 *
 * Akış:
 *   1. Her entry için ham (mutlak) skor hesapla.
 *   2. ABSOLUTE_FLOOR altındaki ham skorları ELE (gürültü filtresi).
 *   3. Kalanları, bu sorgudaki en yüksek ham skora göre 0..1'e normalize et
 *      (görüntüleme yüzdesi).
 *   4. minScore (normalize) altındakileri ele, sırala, limitle.
 */
export function search(
  index: EffikitIndex,
  query: string,
  options: { limit?: number; minScore?: number; section?: string } = {}
): ScoredMatch[] {
  const { limit = 8, minScore = 0.15 } = options;
  const ctx = buildQueryContext(query);
  if (ctx.tokens.length === 0) return [];

  const pool = options.section
    ? index.entries.filter((e) => e.section === options.section)
    : index.entries;

  // 1 + 2: ham skor + mutlak taban filtresi
  const scored = pool
    .map((entry) => {
      const { raw, reasons } = scoreEntry(entry, ctx, index);
      return { entry, raw, reasons };
    })
    .filter((m) => m.raw >= ABSOLUTE_FLOOR);

  if (scored.length === 0) return [];

  // 3 + 4: normalize, eşik, sırala, limitle
  const top = Math.max(...scored.map((m) => m.raw));
  return scored
    .map((m) => ({
      entry: m.entry,
      score: top > 0 ? m.raw / top : 0,
      reasons: m.reasons,
    }))
    .filter((m) => m.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
