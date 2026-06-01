/**
 * cohesion.ts — Bütünlük Bütçesi (Cohesion Budget) motoru.
 *
 * PROBLEM: "Sınırsız büyüme" sağlıksızdır. Bir effikit klasörü tek bir kavramı
 * temsil etmeli. Şiştikçe iki şey bozulur:
 *   1. effikit_navigate o klasörden çok aday döndürür → alaka skoru bulanıklaşır,
 *      AI gürültüye boğulur.
 *   2. Klasörün tamamı AI bağlamına (context window) sığmaz hale gelir.
 *
 * NEDEN SALT SAYI YETMEZ: Gerçek veri (bkz. kalibrasyon) gösterdi ki sağlıklı
 * dosyalar KASITLI olarak farklı keyword taşır — düşük keyword örtüşmesi kötü
 * değil, sağlıklı uzmanlaşmanın işaretidir. Bu yüzden "dağınıklık cezası"
 * KULLANMIYORUZ. İki dürüst sinyale dayanıyoruz:
 *   • Dosya sayısı  → yapısal yük (kaç aday, ne kadar bölünme baskısı)
 *   • Toplam karakter → bağlam yükü (klasör context'e ne kadar ağırlık bindirir)
 *
 * KARAR DERECELİ: healthy → warn (yumuşak eşik: rehberlik) → violation (sert
 * eşik: build reddi). Tek kör tavan değil; rehberlik eden bir karar motoru.
 *
 * Eşikler indexer.ts tarafından geçilir ve oraya gömülüdür — bu modül saf ve
 * test edilebilir kalır (sıfır I/O, sıfır global durum).
 */

import type {
  CohesionAssessment,
  CohesionReport,
  CohesionThresholds,
  CohesionVerdict,
  EffikitEntry,
} from "./types.js";

/**
 * Deponun GERÇEK dağılımına göre kalibre edilmiş varsayılan eşikler.
 * Ölçüm: max 5 dosya/klasör, ortalama 3.71, max ~50K karakter/klasör.
 * Sağlıklı 3-5 aralığına dokunmaz; yalnızca gerçek şişmede devreye girer.
 */
export const DEFAULT_THRESHOLDS: CohesionThresholds = {
  healthyFiles: 5, // ≤5 dosya: sağlıklı (repo'daki en dolu klasörler tam burada)
  violationFiles: 7, // ≥7 dosya: sert ihlal (6 = yumuşak uyarı arada kalır)
  healthyChars: 55_000, // ≤55K: sağlıklı (ölçülen max ~50K'nın hemen üstü)
  violationChars: 80_000, // ≥80K: sert ihlal (55K-80K arası yumuşak uyarı)
};

/** Tek bir sinyali (sayı/char) dereceye çevirir: 0=healthy 1=warn 2=violation. */
function gradeSignal(
  value: number,
  healthyMax: number,
  violationMin: number
): 0 | 1 | 2 {
  if (value >= violationMin) return 2;
  if (value > healthyMax) return 1;
  return 0;
}

/** Derece (0/1/2) → karar. Açık eşleme; indeks belirsizliği yok. */
function verdictForGrade(grade: 0 | 1 | 2): CohesionVerdict {
  return grade === 2 ? "violation" : grade === 1 ? "warn" : "healthy";
}

/**
 * Tek bir klasörü değerlendirir. Karar, iki sinyalin EN AĞIRINI alır:
 * bir klasör hem az dosyalı hem dev olabilir (4 devasa dosya) — char sinyali
 * onu yakalar; ya da çok sayıda küçük dosyalı olabilir — sayı sinyali yakalar.
 * Hangisi daha kötüyse karar odur. Tek bir sinyale körlük yok.
 */
export function assessGroup(
  section: EffikitEntry["section"],
  group: string,
  files: readonly EffikitEntry[],
  thresholds: CohesionThresholds = DEFAULT_THRESHOLDS
): CohesionAssessment {
  const fileCount = files.length;
  const totalChars = files.reduce((sum, f) => sum + f.sizeChars, 0);

  const fileGrade = gradeSignal(
    fileCount,
    thresholds.healthyFiles,
    thresholds.violationFiles
  );
  const charGrade = gradeSignal(
    totalChars,
    thresholds.healthyChars,
    thresholds.violationChars
  );

  const grade = Math.max(fileGrade, charGrade) as 0 | 1 | 2;
  const verdict = verdictForGrade(grade);

  return {
    path: `${section}/${group}`,
    section,
    group,
    fileCount,
    totalChars,
    verdict,
    reason: explain(verdict, fileCount, totalChars, fileGrade, charGrade, thresholds),
  };
}

/** Kararı, HANGİ sinyalin sınırı aştığını söyleyen net bir cümleye çevirir. */
function explain(
  verdict: CohesionVerdict,
  files: number,
  chars: number,
  fileGrade: number,
  charGrade: number,
  t: CohesionThresholds
): string {
  if (verdict === "healthy") {
    return `${files} dosya · ${chars.toLocaleString("tr-TR")} karakter — bütçe içinde, sağlıklı.`;
  }

  // İhlali/uyarıyı tetikleyen baskın sinyali bul ve somut tavsiye ver.
  const driver =
    charGrade >= fileGrade
      ? `bağlam ağırlığı ${chars.toLocaleString("tr-TR")} karakter ` +
        `(sınır ${(verdict === "violation" ? t.violationChars : t.healthyChars).toLocaleString("tr-TR")})`
      : `${files} dosya ` +
        `(sınır ${verdict === "violation" ? t.violationFiles : t.healthyFiles})`;

  if (verdict === "violation") {
    return (
      `SERT İHLAL: ${driver}. Bu klasör tek bir kavram olmaktan çıkmış — ` +
      `ilgili dosyaları ayrı bir alt-kavrama böl (ör. 'auth' → 'auth' + 'auth.billing'). ` +
      `Build reddedildi.`
    );
  }
  return (
    `UYARI: ${driver}. Henüz engellenmiyor ama klasör bölünme eşiğine yaklaşıyor — ` +
    `bir sonraki eklemeden önce bölmeyi değerlendir.`
  );
}

/**
 * Tüm depoyu klasör bazında değerlendirir.
 * Girdi zaten indekslenmiş entry listesi olduğundan bu fonksiyon saf ve hızlıdır.
 */
export function assessCohesion(
  entries: readonly EffikitEntry[],
  thresholds: CohesionThresholds = DEFAULT_THRESHOLDS
): CohesionReport {
  // section/group bazında grupla
  const groups = new Map<string, EffikitEntry[]>();
  for (const e of entries) {
    const key = `${e.section}/${e.group}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(e);
    else groups.set(key, [e]);
  }

  const assessments: CohesionAssessment[] = [];
  for (const [, files] of groups) {
    const first = files[0]!;
    assessments.push(assessGroup(first.section, first.group, files, thresholds));
  }

  // En kötü önce: violation → warn → healthy, aynı derecede daha dolu olan üstte
  const order: Record<CohesionVerdict, number> = {
    violation: 0,
    warn: 1,
    healthy: 2,
  };
  assessments.sort(
    (a, b) =>
      order[a.verdict] - order[b.verdict] || b.fileCount - a.fileCount
  );

  return {
    assessments,
    violations: assessments.filter((a) => a.verdict === "violation").length,
    warnings: assessments.filter((a) => a.verdict === "warn").length,
    thresholds,
  };
}

/**
 * Sert ihlal varsa fırlatılacak hata. indexer build sırasında bunu yakalamayıp
 * yukarı bırakır → server başlamayı reddeder. "Koda gömülü engelleme" budur:
 * bütünlük bütçesini aşan bir effikit ile sistem ÇALIŞMAZ.
 */
export class CohesionViolationError extends Error {
  constructor(public readonly report: CohesionReport) {
    const violators = report.assessments.filter((a) => a.verdict === "violation");
    const lines = violators.map((v) => `  • ${v.path}: ${v.reason}`);
    super(
      `Effikit bütünlük bütçesi ihlal edildi (${violators.length} klasör). ` +
        `Bu klasörler büyüdükçe AI'nın alaka skorunu ve context bütçesini bozar:\n` +
        lines.join("\n") +
        `\n\nÇözüm: ihlal eden klasörü alt-kavramlara böl. Sınırsız büyüme ` +
        `kasıtlı olarak engellenir — bu bir hata değil, mimari koruma.`
    );
    this.name = "CohesionViolationError";
  }
}
