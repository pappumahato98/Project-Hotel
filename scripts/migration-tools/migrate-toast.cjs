#!/usr/bin/env node
/**
 * Generic codemod: migrate a single file from `useToast` (Radix) to `sonner`.
 *
 * Usage:
 *   node scripts/migration-tools/migrate-toast.cjs <file.tsx> [file2.tsx ...]
 *   node scripts/migration-tools/migrate-toast.cjs --all
 *
 * What it does:
 *   1. Replaces `import { useToast } from "@/hooks/use-toast";` with
 *      `import { toast } from "sonner";`. If the file already imports from
 *      sonner, it just removes the useToast import.
 *   2. Removes `const { toast } = useToast();` lines.
 *   3. Transforms toast calls:
 *        toast({ title: "X" })                                   → toast.success("X")
 *        toast({ title: "X", description: "Y" })                 → toast.success("X", { description: "Y" })
 *        toast({ title: "X", description: VAR })                 → toast.success("X", { description: VAR })
 *        toast({ title: "X", variant: "destructive" })           → toast.error("X")
 *        toast({ title: "X", description: "Y", variant: "destructive" })
 *                                                                 → toast.error("X", { description: "Y" })
 *        toast({ title: VAR, ... })                              → toast(VAR)  (non-string title → plain toast)
 *   4. Leaves alone:
 *        - calls already using `toast.success/.error/.warning/.info/.promise`
 *        - calls with action/onOpenChange/etc (manual review needed)
 *
 * Idempotent: re-running on an already-migrated file is a no-op.
 *
 * Always review the diff before committing.
 */

const fs = require("fs");
const path = require("path");

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Parse the contents of a `toast({ ... })` call's object literal and return
 * { title, description, variant, other } where `other` is the raw source of
 * any other keys. Returns null if the structure is too complex to migrate
 * mechanically.
 */
function parseToastObject(objSource) {
  // objSource is the contents between `toast(` and `)`. It should be a single
  // object literal `{ ... }`. Strip the outer braces.
  const trimmed = objSource.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return null;
  const inner = trimmed.slice(1, -1).trim();
  if (!inner) return { title: null, description: null, variant: null, other: "" };

  // Naive top-level key splitter. Handles string values, identifier values,
  // and template literals. Does NOT handle nested objects/arrays (those go to
  // `other` and require manual review).
  const keys = [];
  let depth = 0, cur = "", inStr = false, strCh = "";
  for (const ch of inner) {
    if (inStr) {
      cur += ch;
      if (ch === strCh && cur[cur.length - 2] !== "\\") inStr = false;
    } else if (ch === '"' || ch === "'" || ch === "`") {
      inStr = true; strCh = ch; cur += ch;
    } else if (ch === "{" || ch === "[" || ch === "(") { depth++; cur += ch;
    } else if (ch === "}" || ch === "]" || ch === ")") { depth--; cur += ch;
    } else if (ch === "," && depth === 0) { keys.push(cur.trim()); cur = "";
    } else { cur += ch; }
  }
  if (cur.trim()) keys.push(cur.trim());

  const result = { title: null, description: null, variant: null, other: [] };
  for (const k of keys) {
    const m = k.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.+)$/s);
    if (!m) { result.other.push(k); continue; }
    const key = m[1], val = m[2].trim();
    if (key === "title") result.title = val;
    else if (key === "description") result.description = val;
    else if (key === "variant") result.variant = val;
    else result.other.push(k);
  }
  return result;
}

function isStringLiteral(s) {
  return /^["'`].*["'`]$/.test(s);
}

function buildReplacement(parsed) {
  if (!parsed) return null;
  if (parsed.other.length > 0) return null; // complex — skip

  const isDestructive = parsed.variant && /["']destructive["']/.test(parsed.variant);
  const method = isDestructive ? "error" : "success";

  // No title — can't migrate cleanly.
  if (!parsed.title) return null;

  // Title is a string literal.
  if (isStringLiteral(parsed.title)) {
    const titleStr = parsed.title.slice(1, -1);
    if (parsed.description) {
      return `toast.${method}(${JSON.stringify(titleStr)}, { description: ${parsed.description} })`;
    }
    return `toast.${method}(${JSON.stringify(titleStr)})`;
  }

  // Title is a variable or expression — use plain toast() with the title as
  // first arg. If there's a description, we can still use the second form.
  if (parsed.description) {
    return `toast.${method}(${parsed.title}, { description: ${parsed.description} })`;
  }
  return `toast.${method}(${parsed.title})`;
}

/**
 * Find matching closing paren starting from the index of the opening paren.
 * Handles nested parens, strings, template literals, and braces.
 */
function findClosingParen(src, openIdx) {
  let depth = 1;
  let i = openIdx + 1;
  let inStr = false, strCh = "";
  while (i < src.length) {
    const ch = src[i];
    if (inStr) {
      if (ch === strCh && src[i - 1] !== "\\") inStr = false;
    } else if (ch === '"' || ch === "'" || ch === "`") {
      inStr = true; strCh = ch;
    } else if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  return -1;
}

function migrateToastCalls(src) {
  let out = "";
  let i = 0;
  let changed = false;
  while (i < src.length) {
    // Look for `toast(` — but skip `toast.success(` / `toast.error(` / etc.
    // which are already migrated.
    if (src.startsWith("toast(", i) && src[i + 5] !== ".") {
      // Skip if this is a property access (e.g. `useToast()`).
      // Check the preceding non-space character.
      let j = i - 1;
      while (j >= 0 && /\s/.test(src[j])) j--;
      if (j >= 0 && (src[j] === "." || /[a-zA-Z0-9_]/.test(src[j]))) {
        out += src[i];
        i++;
        continue;
      }
      // Find the closing paren of this call.
      const openParen = i + 5;
      const closeParen = findClosingParen(src, openParen);
      if (closeParen === -1) {
        out += src[i];
        i++;
        continue;
      }
      const argSource = src.slice(openParen + 1, closeParen);
      const parsed = parseToastObject(argSource);
      const replacement = buildReplacement(parsed);
      if (replacement) {
        out += replacement;
        i = closeParen + 1;
        changed = true;
        continue;
      }
    }
    out += src[i];
    i++;
  }
  return { src: out, changed };
}

function migrateFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }
  let src = fs.readFileSync(filePath, "utf8");
  const before = src;

  // 1. Replace useToast import.
  const hadUseToastImport = /import\s+\{\s*useToast\s*\}\s+from\s+["']@\/hooks\/use-toast["'];?\s*\n/.test(src);
  const alreadyHasSonner = /from\s+["']sonner["']/.test(src);
  if (hadUseToastImport) {
    if (alreadyHasSonner) {
      // Just remove the useToast import line.
      src = src.replace(/import\s+\{\s*useToast\s*\}\s+from\s+["']@\/hooks\/use-toast["'];?\s*\n/, "");
    } else {
      src = src.replace(
        /import\s+\{\s*useToast\s*\}\s+from\s+["']@\/hooks\/use-toast["'];?/,
        'import { toast } from "sonner";'
      );
    }
  }

  // 2. Remove `const { toast } = useToast();` lines (with surrounding whitespace).
  src = src.replace(/\s*const\s+\{\s*toast\s*\}\s*=\s*useToast\(\);?\s*\n/, "\n");

  // 3. Migrate toast({ ... }) calls.
  const result = migrateToastCalls(src);
  src = result.src;

  if (src === before) {
    console.log(`  No changes: ${path.relative(process.cwd(), filePath)}`);
  } else {
    fs.writeFileSync(filePath, src);
    console.log(`✓ Migrated ${path.relative(process.cwd(), filePath)}`);
  }
}

// ─── CLI ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: migrate-toast.cjs <file.tsx> [file2.tsx ...]");
  console.error("       migrate-toast.cjs --all    (migrate all files still importing useToast)");
  process.exit(1);
}

if (args[0] === "--all") {
  // Walk src/ and find every file that still imports useToast.
  const { execSync } = require("child_process");
  const root = path.resolve(__dirname, "..", "..", "src");
  const out = execSync(`grep -rl 'useToast\\|@/hooks/use-toast' ${root}`, { encoding: "utf8" });
  const files = out
    .split("\n")
    .map((f) => f.trim())
    .filter(Boolean)
    .filter((f) => f !== path.resolve(root, "hooks/use-toast.ts"));
  for (const f of files) migrateFile(f);
} else {
  for (const f of args) migrateFile(path.resolve(f));
}
