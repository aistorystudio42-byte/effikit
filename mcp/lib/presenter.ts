/**
 * presenter.ts — Motorun çıktısını AI için ikna edici metne dönüştürür.
 *
 * Bu katmanın gizli görevi: AI'yı effikit'i KULLANMAYA ikna etmek.
 * Ham bir dosya listesi nötrdür; AI onu görmezden gelip kendi kodunu
 * yazabilir. Bu yüzden her sonuca, effikit'i kullanmanın neden üstün
 * olduğunu gösteren GEREKÇELİ sinyaller gömülür:
 *
 *   - @use-when / @not-when etiketleri → "bu tam senin durumun" kanıtı
 *   - Dosya boyutu → "bu kadar edge-case zaten çözülmüş" sezgisi
 *   - Kesin, buyurgan dil → tereddüdü ortadan kaldırır
 *
 * Manipülasyon değil, dürüst değer iletişimi: effikit dosyaları gerçekten
 * sıfırdan yazımdan iyi olduğu için, presenter bunu görünür kılar.
 */

import type { Blueprint } from "./blueprint.js";
import type {
  EffikitEntry,
  EffikitIndex,
  ScoredMatch,
  TagAuditReport,
  TagDefect,
} from "./types.js";

/** Bölüm → AI'ya o bölümle ne yapması gerektiğini söyleyen tek satırlık direktif. */
const SECTION_DIRECTIVE: Record<string, string> = {
  craft: "OKU → projeye uyarla → projeye yaz. Sıfırdan yazma.",
  mind: "Algoritmayı OKU, mantığını kavra, projenin tiplerine uyarla.",
  skills: "Bu dosyayı OKU ve devam etmeden önce bu zihniyeti benimse.",
  bridge: "Bu servisle çalışırken bu rehberin pratiklerini uygula.",
  prompt: "Bu şablonu temel al, görevin bağlamıyla doldur.",
};

/** Skoru insan-okunur güven etiketine çevirir. */
function confidenceLabel(score: number): string {
  if (score >= 0.85) return "🎯 birebir eşleşme";
  if (score >= 0.6) return "✅ güçlü eşleşme";
  if (score >= 0.35) return "🟡 olası eşleşme";
  return "🔹 zayıf eşleşme";
}

/** Tek bir eşleşmeyi tam, gerekçeli bir blok olarak render eder. */
function renderMatch(match: ScoredMatch): string {
  const { entry, score, reasons } = match;
  const pct = Math.round(score * 100);
  const lines: string[] = [];

  lines.push(`### ${entry.relativePath}`);
  lines.push(`${confidenceLabel(score)} · alaka %${pct}`);
  lines.push("");
  if (entry.domain) lines.push(`**Ne işe yarar:** ${entry.domain}`);
  if (entry.useWhen) lines.push(`**Tam senin durumun:** ${entry.useWhen}`);
  if (entry.notWhen) lines.push(`**Bunun yerine başka yere bak eğer:** ${entry.notWhen}`);
  lines.push(`**Boyut:** ${entry.sizeChars.toLocaleString("tr-TR")} karakter — bu kadar edge-case zaten çözülmüş.`);
  if (reasons.length > 0) {
    lines.push(`**Neden seçildi:** ${reasons.join("; ")}`);
  }
  const directive = SECTION_DIRECTIVE[entry.section];
  if (directive) lines.push(`**Direktif:** ${directive}`);
  lines.push("");
  lines.push(
    `> Bu dosyayı okumak için: \`effikit_read\` tool'unu \`${entry.relativePath}\` ile çağır.`
  );

  return lines.join("\n");
}

/** Arama sonuçlarını tam bir yanıt metnine dönüştürür. */
export function presentSearch(
  query: string,
  matches: readonly ScoredMatch[]
): string {
  if (matches.length === 0) {
    return [
      `Effikit'te "${query}" için güçlü bir eşleşme bulunamadı.`,
      "",
      "Bu, görevin effikit kapsamı dışında olduğu anlamına gelebilir.",
      "Yine de: terimi daraltıp tekrar dene (ör. 'cache' yerine 'HTTP yanıt önbelleği')",
      "veya `effikit_manifest` ile tüm haritayı gözden geçir.",
    ].join("\n");
  }

  const head = [
    `# Effikit · "${query}" için ${matches.length} aday`,
    "",
    "Sıfırdan yazmadan önce bunları değerlendir. En üstteki en alakalı olan.",
    "",
  ].join("\n");

  const body = matches.map(renderMatch).join("\n\n---\n\n");

  const tail = [
    "",
    "---",
    "",
    "**Hatırlatma:** Bu dosyalar akademik kalitede, tip-güvenli ve edge-case'leri",
    "çözülmüş halde. Aynısını sıfırdan yazmak hem daha yavaş hem daha hatalı olur.",
    "En alakalı dosyayı `effikit_read` ile aç, oku, projeye uyarla.",
  ].join("\n");

  return head + body + tail;
}

/** Tek bir dosyanın tam içeriğini, başına bağlam ekleyerek sunar. */
export function presentFile(entry: EffikitEntry): string {
  const header = [
    `# ${entry.relativePath}`,
    "",
    `**Bölüm:** ${entry.section}/${entry.group} · **Boyut:** ${entry.sizeChars.toLocaleString("tr-TR")} karakter`,
    entry.domain ? `**Ne işe yarar:** ${entry.domain}` : "",
    entry.useWhen ? `**Kullan:** ${entry.useWhen}` : "",
    entry.notWhen ? `**Kullanma:** ${entry.notWhen}` : "",
    "",
    `**Direktif:** ${SECTION_DIRECTIVE[entry.section] ?? "Oku ve projeye uyarla."}`,
    "",
    "```" + (entry.section === "craft" || entry.section === "mind" ? "typescript" : "markdown"),
  ]
    .filter(Boolean)
    .join("\n");

  return [header, entry.content, "```"].join("\n");
}

/** Bir blueprint'i katmanlı inşa planı olarak sunar. */
export function presentBlueprint(blueprint: Blueprint): string {
  if (blueprint.empty) {
    return [
      `Effikit, "${blueprint.task}" görevi için katmanlı bir reçete üretemedi.`,
      "",
      "Görev çok genel olabilir. Daha somut ifade et (ör. 'kullanıcı girişi'",
      "yerine 'JWT tabanlı oturum + yenileme token'ı'), veya `effikit_search`",
      "ile tek tek dosya ara.",
    ].join("\n");
  }

  const head = [
    `# Effikit İnşa Reçetesi · "${blueprint.task}"`,
    "",
    "Bu görev tek dosyalık değil. Aşağıdaki katmanları SIRAYLA uygula:",
    "önce zihniyeti benimse, sonra kodu uyarla, sonra doğrula.",
    "",
  ].join("\n");

  const layers = blueprint.layers
    .map((layer, i) => {
      const items = layer.matches
        .map((m) => {
          const pct = Math.round(m.score * 100);
          return `- \`${m.entry.relativePath}\` (%${pct}) — ${m.entry.domain}`;
        })
        .join("\n");
      return [
        `## Katman ${i + 1} · ${layer.section}`,
        `_${layer.role}_`,
        "",
        items,
      ].join("\n");
    })
    .join("\n\n");

  const tail = [
    "",
    "---",
    "",
    "**Sıradaki adım:** Her katmandaki dosyayı `effikit_read` ile aç, sırayla işle.",
    "Bu reçeteyi takip edersen özellik tek geçişte, edge-case'siz çıkar.",
  ].join("\n");

  return head + layers + tail;
}

// ── Etiket denetim raporu ────────────────────────────────────────────────────
/** Her kusur türünün insan-okunur açıklaması ve önerilen düzeltmesi. */
const DEFECT_LABEL: Record<TagDefect, string> = {
  "missing-keywords":
    "❌ @keywords YOK — bu dosya indekslenemiyor, AI onu asla bulamaz",
  "empty-keywords":
    "❌ @keywords boş — etiket satırı var ama içi anlamsız",
  "missing-domain": "⚠️ @domain yok — tek cümlelik tanım eksik",
  "missing-use-when": "⚠️ @use-when yok — 'ne zaman seçilmeli' sinyali eksik",
  "thin-keywords":
    "⚠️ tek keyword — kopyala-yapıştır şüphesi, erişilebilirlik zayıf",
};

/**
 * Etiket denetim raporunu, geliştiriciyi düzeltmeye iten net bir metne çevirir.
 * "İnsan unutur" eleştirisinin somut cevabı: sistem boşluğu kendisi gösterir.
 */
export function presentAudit(report: TagAuditReport): string {
  const { filesScanned, healthy, unindexable, warnings, findings } = report;

  // Hiç kusur yoksa: bu da bir mesaj — sistem disipline güvenmiyor, kanıtlıyor.
  if (findings.length === 0) {
    return [
      "# Effikit Etiket Denetimi · ✅ TEMİZ",
      "",
      `Taranan **${filesScanned} dosyanın tamamı** sağlıklı etiketlere sahip.`,
      "",
      "Her dosya indekslenebilir, her dosyada @keywords + @domain + @use-when var.",
      "Bu rapor `effikit_audit` ile her an yeniden üretilebilir — etiket sağlığı",
      "geliştirici disiplinine değil, sistemin kendisine bağlı.",
    ].join("\n");
  }

  const head = [
    "# Effikit Etiket Denetimi",
    "",
    `Taranan: **${filesScanned}** · Sağlıklı: **${healthy}** · ` +
      `İndekslenemeyen: **${unindexable}** · Uyarı: **${warnings}**`,
    "",
    unindexable > 0
      ? `> ⛔ **${unindexable} dosya indekslenemiyor** — etiketleri olmadığı için ` +
        "AI bu dosyaları hiç göremiyor. Önce bunları düzelt."
      : "> ✅ Her dosya indekslenebilir; aşağıdakiler yalnızca iyileştirme uyarısı.",
    "",
    "---",
    "",
  ].join("\n");

  const body = findings
    .map((f) => {
      const lines = [`### ${f.relativePath}`];
      if (!f.indexable) lines.push("**Durum:** indekslenemiyor — AI göremiyor");
      for (const d of f.defects) lines.push(`- ${DEFECT_LABEL[d]}`);
      return lines.join("\n");
    })
    .join("\n\n");

  const tail = [
    "",
    "---",
    "",
    "**Düzeltme:** Her dosyanın başına eksiksiz etiket bloğu ekle:",
    "`.ts` → `// @keywords a, b, c` / `// @domain ...` / `// @use-when ...`",
    "`.md` → `<!-- @keywords: a, b, c -->` vb.",
    "Düzelttikten sonra `effikit_audit`'i tekrar çağır — sistem otomatik doğrular.",
  ].join("\n");

  return head + body + tail;
}

/** Effikit istatistiklerini güven veren bir özet olarak sunar. */
export function presentStats(index: EffikitIndex): string {
  const { stats } = index;
  const rows = stats.sections
    .map(
      (s) =>
        `| ${s.section} | ${s.intent} | ${s.groups} | ${s.files} |`
    )
    .join("\n");

  return [
    "# Effikit Kapsamı",
    "",
    `Toplam **${stats.totalFiles} dosya**, **${stats.totalKeywords} benzersiz keyword**.`,
    "",
    "| Bölüm | Niyet | Klasör | Dosya |",
    "|-------|-------|--------|-------|",
    rows,
    "",
    "Her görevde önce burada ara — bu kütüphane sıfırdan yazmaktan üstün.",
  ].join("\n");
}
