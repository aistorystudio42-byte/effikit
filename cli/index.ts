#!/usr/bin/env node
/**
 * cli/index.ts — Effikit CLI
 *
 * AI olmadan terminalden effikit kütüphanesini kullanmayı sağlar.
 *
 * Kullanım:
 *   npx tsx cli/index.ts add <keyword>      → en alakalı dosyayı mevcut dizine kopyalar
 *   npx tsx cli/index.ts search <keyword>   → skora göre adayları listeler
 *   npx tsx cli/index.ts list               → tüm effikit haritasını gösterir
 *
 * Aynı mantık, npx effikit <komut> olarak da çalışır (package.json bin tanımı).
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// ── Kökleri çöz ──────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EFFIKIT_ROOT = path.resolve(__dirname, "..");
const MCP_LIB = path.join(EFFIKIT_ROOT, "mcp", "lib");

// ── MCP lib dinamik import (mcp/ kendi tsconfig'ine sahip) ───────────────────
async function loadMcp() {
  const { buildIndex } = await import(
    path.join(MCP_LIB, "indexer.js") as unknown as string
  );
  const { search } = await import(
    path.join(MCP_LIB, "scorer.js") as unknown as string
  );
  return { buildIndex, search };
}

// ── Renkler (ANSI — Windows 10+ ve modern terminaller destekler) ──────────────
const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  dim: "\x1b[2m",
};

function bold(s: string) { return `${C.bold}${s}${C.reset}`; }
function green(s: string) { return `${C.green}${s}${C.reset}`; }
function cyan(s: string) { return `${C.cyan}${s}${C.reset}`; }
function yellow(s: string) { return `${C.yellow}${s}${C.reset}`; }
function red(s: string) { return `${C.red}${s}${C.reset}`; }
function dim(s: string) { return `${C.dim}${s}${C.reset}`; }

// ── Yardımcılar ───────────────────────────────────────────────────────────────

function bar(score: number, width = 20): string {
  const filled = Math.round(score * width);
  return green("█".repeat(filled)) + dim("░".repeat(width - filled));
}

function printUsage() {
  console.log(`
${bold("effikit")} — Kişisel geliştirici araç seti CLI

${bold("Komutlar:")}
  ${cyan("add")} <keyword>      En alakalı dosyayı mevcut dizine kopyalar
  ${cyan("search")} <keyword>   Aday dosyaları skora göre listeler (kopyalamaz)
  ${cyan("list")}               Tüm effikit dosyalarını bölüme göre listeler

${bold("Örnekler:")}
  npx tsx cli/index.ts add "kullanıcı arama"
  npx tsx cli/index.ts add jwt auth
  npx tsx cli/index.ts search "öneri sistemi"
  npx tsx cli/index.ts list
`);
}

// ── Komut: search ─────────────────────────────────────────────────────────────

async function cmdSearch(query: string, silent = false): Promise<unknown[]> {
  const { buildIndex, search } = await loadMcp();
  const index = buildIndex(EFFIKIT_ROOT, false);

  const matches = search(index, query, { limit: 8, minScore: 0.05 });

  if (matches.length === 0) {
    if (!silent) {
      console.log(yellow(`\n"${query}" için eşleşme bulunamadı.\n`));
      console.log(dim("İpucu: daha genel bir terim dene veya 'effikit list' ile kataloğu gör.\n"));
    }
    return [];
  }

  if (!silent) {
    console.log(`\n${bold("Arama:")} ${cyan(query)}\n`);
    matches.forEach((m: any, i: number) => {
      const pct = Math.round(m.score * 100);
      console.log(
        `  ${bold(String(i + 1).padStart(2))}. ${bold(m.entry.relativePath)}`
      );
      console.log(
        `      ${bar(m.score)} ${String(pct).padStart(3)}%  ${dim(m.entry.domain)}`
      );
      if (m.reasons.length > 0) {
        console.log(`      ${dim("→ " + m.reasons.slice(0, 2).join(" · "))}`);
      }
      console.log();
    });
  }

  return matches;
}

// ── Komut: add ────────────────────────────────────────────────────────────────

async function cmdAdd(query: string): Promise<void> {
  console.log(`\n${bold("effikit add")} — "${cyan(query)}"\n`);

  const matches: any[] = (await cmdSearch(query, true)) as any[];

  if (matches.length === 0) {
    console.log(yellow(`"${query}" için eşleşme bulunamadı.\n`));
    console.log(dim("İpucu: 'effikit search <terim>' ile farklı bir terim dene.\n"));
    process.exit(1);
  }

  // En yüksek skorlu adayı göster; kullanıcı onaylasın
  const top = matches[0];
  const srcPath = top.entry.absolutePath;
  const fileName = path.basename(srcPath);
  const destPath = path.join(process.cwd(), fileName);

  console.log(`${bold("En iyi eşleşme:")}`);
  console.log(`  ${cyan(top.entry.relativePath)}`);
  console.log(`  ${dim(top.entry.domain)}`);
  console.log(`  Alaka: ${bar(top.score)} ${Math.round(top.score * 100)}%`);

  if (top.entry.useWhen) {
    console.log(`  Ne zaman: ${dim(top.entry.useWhen)}`);
  }
  if (top.entry.notWhen) {
    console.log(`  Ne zaman değil: ${dim(top.entry.notWhen)}`);
  }

  // Alternatifler varsa listele
  if (matches.length > 1) {
    console.log(`\n${dim("Diğer adaylar:")}`);
    matches.slice(1, 4).forEach((m: any, i: number) => {
      console.log(
        `  ${dim(`${i + 2}.`)} ${dim(m.entry.relativePath)}  ${Math.round(m.score * 100)}%`
      );
    });
  }

  // Hedef dosya zaten varsa uyar
  if (fs.existsSync(destPath)) {
    console.log(`\n${yellow("Uyarı:")} ${fileName} zaten mevcut dizinde var.`);
    console.log(dim("Üzerine yazılmayacak. Farklı bir isimle kopyalamak için dosyayı yeniden adlandır.\n"));
    process.exit(0);
  }

  // Kopyala
  fs.copyFileSync(srcPath, destPath);
  console.log(`\n${green("✓")} ${bold(fileName)} mevcut dizine kopyalandı.`);
  console.log(
    dim(
      "\nİpucu: Bu dosyayı projeye uyarla. Effikit orijinalini asla değiştirme!\n"
    )
  );
}

// ── Komut: list ───────────────────────────────────────────────────────────────

async function cmdList(): Promise<void> {
  const { buildIndex } = await loadMcp();
  const index = buildIndex(EFFIKIT_ROOT, false);

  const bySection = new Map<string, Map<string, typeof index.entries>>();
  for (const e of index.entries) {
    const groups = bySection.get(e.section) ?? new Map<string, typeof index.entries>();
    const files = groups.get(e.group) ?? [];
    (files as any[]).push(e);
    groups.set(e.group, files as any);
    bySection.set(e.section, groups);
  }

  console.log(`\n${bold("Effikit Kataloğu")} — ${index.stats.totalFiles} dosya\n`);

  const sectionIcons: Record<string, string> = {
    craft: "⚙️ ",
    mind: "🧠",
    skills: "🎯",
    bridge: "🌉",
    prompt: "💬",
  };

  for (const [section, groups] of [...bySection.entries()].sort()) {
    const icon = sectionIcons[section] ?? "📁";
    console.log(`${icon}  ${bold(section + "/")}`);
    for (const [group, files] of [...groups.entries()].sort()) {
      const names = (files as any[]).map((f: any) => f.name).sort().join(dim(", "));
      console.log(`   ${cyan(group + "/")} → ${names}`);
    }
    console.log();
  }

  console.log(dim("Bir dosyayı almak için: npx tsx cli/index.ts add <keyword>\n"));
}

// ── Router ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!cmd || cmd === "--help" || cmd === "-h") {
    printUsage();
    return;
  }

  const query = args.slice(1).join(" ").trim();

  try {
    if (cmd === "search") {
      if (!query) {
        console.error(red("Hata: 'search' komutu bir arama terimi gerektirir.\n"));
        console.error(dim("Örnek: npx tsx cli/index.ts search \"jwt auth\"\n"));
        process.exit(1);
      }
      await cmdSearch(query);
    } else if (cmd === "add") {
      if (!query) {
        console.error(red("Hata: 'add' komutu bir arama terimi gerektirir.\n"));
        console.error(dim("Örnek: npx tsx cli/index.ts add \"öneri sistemi\"\n"));
        process.exit(1);
      }
      await cmdAdd(query);
    } else if (cmd === "list") {
      await cmdList();
    } else {
      // Bilinmeyen komut → add gibi davran (kısa kullanım: npx effikit jwt)
      const fullQuery = args.join(" ").trim();
      console.log(dim(`Komut tanınmadı, arama yapılıyor: "${fullQuery}"\n`));
      await cmdAdd(fullQuery);
    }
  } catch (err: any) {
    if (err?.message?.includes("navigation.md")) {
      console.error(
        red("\nHata: Bu komut effikit repo kökünden çalıştırılmalıdır.\n")
      );
    } else {
      console.error(red(`\nHata: ${err?.message ?? err}\n`));
    }
    process.exit(1);
  }
}

main();
