/**
 * blueprint.ts — Çok-dosyalı görev reçeteleri.
 *
 * Tek bir dosya nadiren bir özelliğin tamamını karşılar. Gerçek bir
 * "kullanıcı girişi" özelliği şunları ister: oturum mantığı (craft/auth),
 * token işleme (craft/auth), güvenlik zihniyeti (skills/security) ve belki
 * bir inceleme promptu (prompt/review). Blueprint, serbest bir görev
 * tanımını bu katmanlı reçeteye çevirir.
 *
 * Yaklaşım: tek bir geniş arama yapmak yerine, görevi niyet-bölümlerine
 * göre AYRI AYRI sorgular ve her bölümden en güçlü adayları toplarız.
 * Böylece sonuç hem "kod" hem "davranış" hem "şablon" içerir — AI'ya
 * eksiksiz bir inşa planı sunar.
 */

import { search } from "./scorer.js";
import type {
  EffikitIndex,
  EffikitSection,
  ScoredMatch,
} from "./types.js";

export interface BlueprintLayer {
  readonly section: EffikitSection;
  /** Bu katmanın görevdeki rolü — AI'ya neden gerektiğini anlatır */
  readonly role: string;
  readonly matches: readonly ScoredMatch[];
}

export interface Blueprint {
  readonly task: string;
  readonly layers: readonly BlueprintLayer[];
  /** Hiçbir katman dolmadıysa true — görev effikit kapsamı dışında olabilir */
  readonly empty: boolean;
}

/**
 * Her bölümün bir görevdeki rolü. Sıra önemli: AI'ya önce nasıl düşüneceğini
 * (skills), sonra ne ile inşa edeceğini (craft/mind), sonra nasıl
 * doğrulayacağını (prompt) sunarız.
 */
const LAYER_PLAN: ReadonlyArray<{
  section: EffikitSection;
  role: string;
  limit: number;
}> = [
  {
    section: "skills",
    role: "Bu göreve girişmeden önce benimsenecek uzman zihniyeti ve ilkeler",
    limit: 2,
  },
  {
    section: "craft",
    role: "Projeye uyarlanacak hazır, tip-güvenli implementasyon kodu",
    limit: 3,
  },
  {
    section: "mind",
    role: "Görev akıllı bir algoritma gerektiriyorsa hazır algoritma kütüphanesi",
    limit: 2,
  },
  {
    section: "bridge",
    role: "İlgili bir harici servis/MCP entegrasyonu gerekiyorsa rehber",
    limit: 1,
  },
  {
    section: "prompt",
    role: "İşi tamamladıktan sonra doğrulama/inceleme için hazır prompt",
    limit: 1,
  },
];

/**
 * Bir görev tanımını katmanlı bir inşa reçetesine dönüştürür.
 * Her bölüm bağımsız sorgulanır; yalnızca anlamlı eşik üstü eşleşmeler
 * (minScore) katmana girer. Boş katmanlar gürültü yaratmamak için elenir.
 */
export function buildBlueprint(
  index: EffikitIndex,
  task: string
): Blueprint {
  const layers: BlueprintLayer[] = [];

  for (const plan of LAYER_PLAN) {
    const matches = search(index, task, {
      section: plan.section,
      limit: plan.limit,
      // Mutlak taban (ABSOLUTE_FLOOR) zaten gürültüyü eler; burada normalize
      // eşiğini yüksek tutarız ki reçeteye yalnızca güçlü adaylar girsin.
      minScore: 0.5,
    });
    if (matches.length > 0) {
      layers.push({ section: plan.section, role: plan.role, matches });
    }
  }

  return {
    task,
    layers,
    empty: layers.length === 0,
  };
}
