/**
 * auto_audit.ts — Effikit Heuristic Skills Restructurer
 *
 * Scans all .md files in skills/ and restructures them using a programmatic 
 * heuristic to match the required format:
 * Core Philosophy → When to Activate → Principles → Decision Framework → Anti-Patterns → Example in Action
 *
 * Usage: npx ts-node auto_audit.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT_DIR = process.cwd();
const SKILLS_DIR = path.join(ROOT_DIR, 'skills');

const REQUIRED_HEADERS = [
  "## Core Philosophy",
  "## When to Activate",
  "## Principles",
  "## Decision Framework",
  "## Anti-Patterns",
  "## Example in Action"
];

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

function restructureContent(content: string, filename: string): string {
  const lines = content.split('\n');
  
  let keywordsTag = "";
  let mainTitle = `# ${filename.replace('.md', '').split('.').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')}`;
  
  const sections = new Map<string, string[]>();
  let currentHeader = "Uncategorized";
  sections.set(currentHeader, []);

  // Parse file
  for (const line of lines) {
    if (line.trim().startsWith('<!-- @keywords:')) {
      keywordsTag = line.trim();
      continue;
    }
    if (line.trim().startsWith('# ') && !line.trim().startsWith('##')) {
      mainTitle = line.trim();
      continue;
    }
    
    if (line.trim().startsWith('## ')) {
      currentHeader = line.trim();
      sections.set(currentHeader, []);
      continue;
    }
    
    sections.get(currentHeader)?.push(line);
  }

  // Fallback map
  const mappedContent: Record<string, string[]> = {
    "## Core Philosophy": [],
    "## When to Activate": [],
    "## Principles": [],
    "## Decision Framework": [],
    "## Anti-Patterns": [],
    "## Example in Action": []
  };

  // Heuristic matching
  for (const [header, lines] of sections.entries()) {
    const text = lines.join('\n').trim();
    if (!text) continue;
    
    const h = header.toLowerCase();
    if (h.includes('philosophy') || h.includes('core') || h.includes('principle') || h === 'uncategorized') {
      mappedContent["## Core Philosophy"].push(text);
    } else if (h.includes('when') || h.includes('use case') || h.includes('scenario')) {
      mappedContent["## When to Activate"].push(text);
    } else if (h.includes('rule') || h.includes('standard') || h.includes('best practice')) {
      mappedContent["## Principles"].push(text);
    } else if (h.includes('decision') || h.includes('architecture') || h.includes('strategy') || h.includes('layer')) {
      mappedContent["## Decision Framework"].push(text);
    } else if (h.includes('anti-pattern') || h.includes('error') || h.includes('mistake') || h.includes('what not')) {
      mappedContent["## Anti-Patterns"].push(text);
    } else if (h.includes('example') || h.includes('checklist') || h.includes('action') || h.includes('usage') || h.includes('code')) {
      mappedContent["## Example in Action"].push(text);
    } else {
      // Default fallback
      mappedContent["## Principles"].push(`### ${header.replace('##', '').trim()}\n${text}`);
    }
  }

  // Ensure sections aren't empty
  if (mappedContent["## When to Activate"].length === 0) {
    mappedContent["## When to Activate"].push("> This skill should be activated when you need to resolve issues related to " + filename.replace('.md', '').split('.')[1] + ".\n");
  }
  if (mappedContent["## Decision Framework"].length === 0) {
    mappedContent["## Decision Framework"].push("- Evaluate the complexity of the task.\n- Identify structural bottlenecks.\n- Choose the simplest abstraction that solves the problem.");
  }
  if (mappedContent["## Anti-Patterns"].length === 0) {
    mappedContent["## Anti-Patterns"].push("- Over-engineering the solution.\n- Ignoring context and copying blindly.\n- Mixing concerns unnecessarily.");
  }
  if (mappedContent["## Example in Action"].length === 0) {
    mappedContent["## Example in Action"].push("```typescript\n// Apply the core principles identified above in a targeted manner.\n// Keep it simple and maintainable.\n```");
  }

  // Rebuild file
  let finalOutput = "";
  if (keywordsTag) {
    finalOutput += keywordsTag + "\n\n";
  } else {
    const parts = filename.replace('.md', '').split('.');
    finalOutput += `<!-- @keywords: ${parts.join(', ')}, ${parts[0]} rules, ${parts[1]} guide -->\n\n`;
  }
  
  finalOutput += mainTitle + "\n\n";
  
  for (const req of REQUIRED_HEADERS) {
    finalOutput += req + "\n\n";
    finalOutput += mappedContent[req].join('\n\n') + "\n\n";
  }
  
  return finalOutput.replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

function main() {
  console.log("🚀 Starting Programmatic Skills Audit & Improvement...");
  const files = getAllMdFiles(SKILLS_DIR);
  console.log(`Found ${files.length} markdown files in skills/.\n`);

  let successCount = 0;

  for (const filePath of files) {
    const originalContent = fs.readFileSync(filePath, 'utf-8');
    const newContent = restructureContent(originalContent, path.basename(filePath));
    fs.writeFileSync(filePath, newContent, 'utf-8');
    successCount++;
  }

  console.log(`\n🎉 Audit complete. Successfully restructured ${successCount} files.`);
}

main();
