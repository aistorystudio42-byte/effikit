/**
 * audit_skills.ts — Effikit Skills Rewriter
 *
 * Scans all .md files in skills/ and uses the Anthropic Claude API to rewrite them
 * into the required strict format:
 * Core Philosophy → When to Activate → Principles → Decision Framework → Anti-Patterns → Example in Action
 *
 * Usage: 
 *   set ANTHROPIC_API_KEY=your_key
 *   npx ts-node audit_skills.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT_DIR = path.resolve(__dirname);
const SKILLS_DIR = path.join(ROOT_DIR, 'skills');
const API_KEY = process.env.ANTHROPIC_API_KEY;

if (!API_KEY) {
  console.error("❌ Error: ANTHROPIC_API_KEY environment variable is not set.");
  process.exit(1);
}

// ─── File Scanner ─────────────────────────────────────────────────────────────

function getAllMdFiles(dirPath: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dirPath)) return results;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllMdFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(fullPath);
    }
  }
  return results;
}

// ─── LLM Integration ──────────────────────────────────────────────────────────

async function rewriteContentWithClaude(content: string, filePath: string): Promise<string> {
  const systemPrompt = `You are an expert software engineering technical writer for Effikit.
Your task is to take the provided technical markdown file and REWRITE it to strictly follow this exact format:
1. Core Philosophy
2. When to Activate
3. Principles
4. Decision Framework
5. Anti-Patterns
6. Example in Action

Do not add extra sections. Make the content:
- Genuinely actionable — Claude must follow instructions directly
- Real working examples — no placeholders
- Decisive language — no "maybe", "sometimes", "you could"
- Opinionated — clear stance, not "it depends"
- 400-800 words per file — dense, no padding

Preserve the original <!-- @keywords: ... --> tag EXACTLY as it is, placing it at the very top of the output.
Output raw markdown without wrapping it in a markdown code block (i.e. do not use \`\`\`markdown at the start).
`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY as string,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-3-7-sonnet-20250219", // Latest strong model
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Here is the current content of ${path.basename(filePath)}:\n\n${content}`
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} ${response.statusText}\n${errorText}`);
  }

  const data = await response.json();
  let rewritten = data.content[0].text;
  
  // Clean up if Claude mistakenly wrapped it in ```markdown
  if (rewritten.startsWith('```markdown')) {
    rewritten = rewritten.replace(/^```markdown\n/, '').replace(/\n```$/, '');
  }
  
  return rewritten;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 Starting Skills Audit & Improvement...");
  const files = getAllMdFiles(SKILLS_DIR);
  console.log(`Found ${files.length} markdown files in skills/.\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i];
    const relativePath = path.relative(ROOT_DIR, filePath);
    console.log(`[${i + 1}/${files.length}] Processing ${relativePath}...`);
    
    try {
      const originalContent = fs.readFileSync(filePath, 'utf-8');
      
      // Prevent rewriting if it already strongly matches the structure (optional, but good for idempotency)
      if (
        originalContent.includes('## Core Philosophy') &&
        originalContent.includes('## When to Activate') &&
        originalContent.includes('## Principles') &&
        originalContent.includes('## Decision Framework') &&
        originalContent.includes('## Anti-Patterns') &&
        originalContent.includes('## Example in Action')
      ) {
        console.log(`  ⚡ Already formatted correctly. Skipping.`);
        successCount++;
        continue;
      }

      const newContent = await rewriteContentWithClaude(originalContent, filePath);
      fs.writeFileSync(filePath, newContent, 'utf-8');
      console.log(`  ✅ Successfully rewritten.`);
      successCount++;
      
      // Sleep a bit to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error: any) {
      console.error(`  ❌ Failed to process ${relativePath}:`, error.message);
      failCount++;
    }
  }

  console.log(`\n🎉 Audit complete. Successfully processed ${successCount} files. Failed: ${failCount}`);
}

main().catch(console.error);
