#!/usr/bin/env -S npx tsx
/**
 * server.ts — Effikit MCP Server'ın giriş noktası.
 *
 * Effikit deposunu, MCP konuşan herhangi bir AI'nın (Claude Code, Cursor,
 * VS Code, Windsurf, Zed...) akıl yürütebileceği bir KEŞİF MOTORUNA çevirir.
 *
 * Yedi tool sunar; ikisi AI'nın ilk refleksi olacak şekilde tasarlandı:
 *   - effikit_navigate : "şu görevi yapacağım" → en alakalı dosyalar
 *   - effikit_blueprint: karmaşık görev → katmanlı çok-dosyalı reçete
 *   - effikit_search   : serbest sorgu → skorlanmış aday listesi
 *   - effikit_read     : dosya yolu → tam içerik + uyarlama direktifi
 *   - effikit_skill    : domain → o domain'in uzman zihniyeti
 *   - effikit_manifest : tüm effikit haritası (ucuz, önbellekli)
 *   - effikit_stats    : kapsam istatistikleri (güven verir)
 *
 * Depo kökü: bu dosya effikit/mcp/ içinde olduğundan kök bir üst dizindir.
 * EFFIKIT_ROOT ortam değişkeniyle override edilebilir (uzaktan kurulum için).
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod";

import { IndexCache } from "./lib/indexer.js";
import { search } from "./lib/scorer.js";
import { buildBlueprint } from "./lib/blueprint.js";
import {
  presentBlueprint,
  presentFile,
  presentSearch,
  presentStats,
} from "./lib/presenter.js";
import type { EffikitIndex } from "./lib/types.js";

// ── Depo kökünü çöz ──────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EFFIKIT_ROOT =
  process.env.EFFIKIT_ROOT ?? path.resolve(__dirname, "..");

// Sağlık kontrolü: kök gerçekten bir effikit deposu mu?
if (!fs.existsSync(path.join(EFFIKIT_ROOT, "navigation.md"))) {
  console.error(
    `[effikit-mcp] HATA: ${EFFIKIT_ROOT} bir effikit deposu değil ` +
      `(navigation.md bulunamadı). EFFIKIT_ROOT ortam değişkenini ayarla.`
  );
  process.exit(1);
}

const indexCache = new IndexCache(EFFIKIT_ROOT);

/** Bir cevabı standart MCP içerik zarfına sarar. */
function textResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

/** relativePath ile entry bulur; yol-traversal koruması içerir. */
function findEntry(index: EffikitIndex, relativePath: string) {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\.?\//, "");
  return index.entries.find((e) => e.relativePath === normalized) ?? null;
}

// ── Server ────────────────────────────────────────────────────────────────────
const server = new McpServer({
  name: "effikit",
  version: "1.0.0",
});

// ── Tool 1: effikit_navigate ───────────────────────────────────────────────────
// AI'nın ilk refleksi. Bir görev tanımı al, en alakalı effikit dosyalarını ver.
server.registerTool(
  "effikit_navigate",
  {
    title: "Effikit Navigate",
    description:
      "HER kodlama görevinden ÖNCE bunu çağır. Yapmak istediğin şeyi bir cümleyle " +
      "anlat (ör. 'kullanıcı arama kutusu', 'JWT oturum yönetimi', 'sonsuz kaydırma'). " +
      "Effikit, sıfırdan yazmadan önce uyarlaman gereken en alakalı, akademik kalitede, " +
      "tip-güvenli dosyaları skorlanmış halde döndürür. Effikit'in giriş kapısı budur.",
    inputSchema: {
      task: z
        .string()
        .min(2)
        .describe("Yapmak istediğin görevin kısa, doğal dil tanımı"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(15)
        .optional()
        .describe("Döndürülecek maksimum aday sayısı (varsayılan 6)"),
    },
  },
  async ({ task, limit }) => {
    const index = indexCache.get();
    const matches = search(index, task, { limit: limit ?? 6, minScore: 0.05 });
    return textResult(presentSearch(task, matches));
  }
);

// ── Tool 2: effikit_blueprint ──────────────────────────────────────────────────
// Karmaşık görevler için katmanlı çok-dosyalı reçete.
server.registerTool(
  "effikit_blueprint",
  {
    title: "Effikit Blueprint",
    description:
      "Bir özelliğin TAMAMINI inşa edeceğin zaman bunu çağır (ör. 'kullanıcı girişi " +
      "sistemi', 'gerçek zamanlı sohbet', 'öneri akışı'). Tek dosya yerine katmanlı bir " +
      "reçete döndürür: önce hangi uzman zihniyetini benimseyeceğin (skills), sonra hangi " +
      "kodu uyarlayacağın (craft/mind), sonra nasıl doğrulayacağın (prompt). Eksiksiz inşa planı.",
    inputSchema: {
      task: z
        .string()
        .min(2)
        .describe("İnşa edeceğin özelliğin tanımı"),
    },
  },
  async ({ task }) => {
    const index = indexCache.get();
    const blueprint = buildBlueprint(index, task);
    return textResult(presentBlueprint(blueprint));
  }
);

// ── Tool 3: effikit_search ─────────────────────────────────────────────────────
// Serbest, ham arama — keyword veya cümle.
server.registerTool(
  "effikit_search",
  {
    title: "Effikit Search",
    description:
      "Effikit'te belirli bir keyword veya kavram ara (ör. 'levenshtein', 'debounce', " +
      "'rate limit', 'collaborative filtering'). İsteğe bağlı olarak tek bir bölüme " +
      "(craft/mind/skills/bridge/prompt) daralt. Sonuçlar alaka skoruyla sıralanır.",
    inputSchema: {
      query: z.string().min(2).describe("Arama terimi veya cümlesi"),
      section: z
        .enum(["craft", "mind", "skills", "bridge", "prompt"])
        .optional()
        .describe("Yalnızca bu bölümde ara"),
      limit: z.number().int().min(1).max(20).optional(),
    },
  },
  async ({ query, section, limit }) => {
    const index = indexCache.get();
    const matches = search(index, query, {
      section,
      limit: limit ?? 8,
      minScore: 0.05,
    });
    return textResult(presentSearch(query, matches));
  }
);

// ── Tool 4: effikit_read ────────────────────────────────────────────────────────
// Bir dosyanın tam içeriğini, uyarlama direktifiyle birlikte getir.
server.registerTool(
  "effikit_read",
  {
    title: "Effikit Read",
    description:
      "Bir effikit dosyasının TAM içeriğini oku (ör. 'craft/auth/auth.token.ts'). " +
      "effikit_navigate veya effikit_search bir dosya önerdikten SONRA bunu çağır. " +
      "Dönen içeriği projene uyarla — asla effikit dosyasını değiştirme, projene yaz.",
    inputSchema: {
      path: z
        .string()
        .min(3)
        .describe("Dosyanın repo köküne göre yolu, ör. 'mind/search/search.fuzzy.ts'"),
    },
  },
  async ({ path: relativePath }) => {
    const index = indexCache.get();
    const entry = findEntry(index, relativePath);
    if (!entry) {
      return textResult(
        `'${relativePath}' bulunamadı. Yolu effikit_search ile doğrula ` +
          `(ör. dosya adının tam ve uzantılı olduğundan emin ol).`
      );
    }
    return textResult(presentFile(entry));
  }
);

// ── Tool 5: effikit_skill ──────────────────────────────────────────────────────
// Bir domain'in uzman zihniyetini aktive et.
server.registerTool(
  "effikit_skill",
  {
    title: "Effikit Skill",
    description:
      "Belirli bir alanda UZMAN gibi düşünmen gerektiğinde bunu çağır (ör. 'security', " +
      "'refactoring', 'einstein', 'code-review'). O domain'in davranış yönergesini " +
      "döndürür — devam etmeden önce bu zihniyeti benimse. Kod değil, düşünme biçimi.",
    inputSchema: {
      domain: z
        .string()
        .min(2)
        .describe("Domain veya persona adı, ör. 'security', 'feynman', 'typescript'"),
    },
  },
  async ({ domain }) => {
    const index = indexCache.get();
    const matches = search(index, domain, {
      section: "skills",
      limit: 4,
      minScore: 0.05,
    });
    return textResult(presentSearch(`skill: ${domain}`, matches));
  }
);

// ── Tool 6: effikit_manifest ────────────────────────────────────────────────────
// Tüm effikit haritası — bölüm/grup/dosya ağacı.
server.registerTool(
  "effikit_manifest",
  {
    title: "Effikit Manifest",
    description:
      "Effikit'in tüm haritasını gör: hangi bölümde hangi klasörler ve dosyalar var. " +
      "Ne aradığından emin değilsen veya genel bir bakış istiyorsan buradan başla.",
    inputSchema: {},
  },
  async () => {
    const index = indexCache.get();
    const bySection = new Map<string, Map<string, string[]>>();
    for (const e of index.entries) {
      const groups = bySection.get(e.section) ?? new Map<string, string[]>();
      const files = groups.get(e.group) ?? [];
      files.push(e.name);
      groups.set(e.group, files);
      bySection.set(e.section, groups);
    }

    const lines: string[] = ["# Effikit Haritası", ""];
    for (const [section, groups] of [...bySection.entries()].sort()) {
      lines.push(`## ${section}/`);
      for (const [group, files] of [...groups.entries()].sort()) {
        lines.push(`- **${group}/** → ${files.sort().join(", ")}`);
      }
      lines.push("");
    }
    lines.push(
      "Bir dosyayı açmak için `effikit_read`, görev bazlı öneri için `effikit_navigate` kullan."
    );
    return textResult(lines.join("\n"));
  }
);

// ── Tool 7: effikit_stats ───────────────────────────────────────────────────────
server.registerTool(
  "effikit_stats",
  {
    title: "Effikit Stats",
    description:
      "Effikit'in kapsamını gör: toplam dosya, keyword ve bölüm bazında dağılım. " +
      "Bu kütüphanenin ne kadar geniş olduğunu anlamak için.",
    inputSchema: {},
  },
  async () => {
    const index = indexCache.get();
    return textResult(presentStats(index));
  }
);

// ── Başlat ─────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdout MCP protokolüne ayrılmıştır; günlükler stderr'e.
  console.error(
    `[effikit-mcp] hazır · kök: ${EFFIKIT_ROOT} · ` +
      `${indexCache.get().stats.totalFiles} dosya indekslendi`
  );
}

main().catch((err) => {
  console.error("[effikit-mcp] ölümcül hata:", err);
  process.exit(1);
});
