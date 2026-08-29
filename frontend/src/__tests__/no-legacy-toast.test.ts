/**
 * Regression test: no `useToast` references anywhere in src/.
 *
 * The legacy Radix-based toast system (`useToast` from `@/hooks/use-toast`)
 * was deleted in favor of `sonner`. This test ensures it doesn't get
 * re-introduced.
 *
 * Run with: pnpm vitest run src/__tests__/no-legacy-toast.test.ts
 *
 * If you genuinely need a toast, use:
 *   import { toast } from "sonner";
 *   toast.success("...");
 *   toast.error("...", { description: "..." });
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const SRC_DIR = path.resolve(__dirname, "..");

// Files allowed to reference useToast (e.g. historical docs, this test file).
// Add a comment per entry explaining why.
const ALLOWED: string[] = [
  // This regression test file itself references `useToast` in the
  // pattern strings it scans for. It is not a real violation.
  "src/__tests__/no-legacy-toast.test.ts",
];

function walkDir(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      out.push(...walkDir(full));
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

function findUseToastRefs(filePath: string): string[] {
  const src = fs.readFileSync(filePath, "utf8");
  const refs: string[] = [];
  // Match `useToast` (the hook call) and `@/hooks/use-toast` (the import).
  const patterns = [
    /useToast\(\)/g,
    /from\s+["']@\/hooks\/use-toast["']/g,
    /from\s+["']@\/components\/ui\/use-toast["']/g,
    /from\s+["']@\/components\/ui\/toaster["']/g,
  ];
  for (const p of patterns) {
    if (p.test(src)) {
      refs.push(p.source);
    }
    p.lastIndex = 0;
  }
  return Array.from(new Set(refs));
}

describe("no legacy useToast references", () => {
  it("no source file imports or calls useToast", () => {
    const offenders: Array<{ file: string; refs: string[] }> = [];
    for (const file of walkDir(SRC_DIR)) {
      const rel = path.relative(process.cwd(), file);
      if (ALLOWED.includes(rel)) continue;
      const refs = findUseToastRefs(file);
      if (refs.length > 0) {
        offenders.push({ file: rel, refs });
      }
    }

    if (offenders.length > 0) {
      const message = [
        "Found legacy useToast references. Use `sonner` instead.",
        "",
        "Offenders:",
        ...offenders.map((o) => `  ${o.file}: ${o.refs.join(", ")}`),
        "",
        "Fix: replace `import { useToast } from \"@/hooks/use-toast\";` with",
        "`import { toast } from \"sonner\";` and use toast.success/.error.",
      ].join("\n");
      expect.fail(message);
    }
  });

  it("the ALLOWED list contains only this test file (smoke check)", () => {
    // The only legitimate entry is this test file itself, which references
    // `useToast` in its scanning patterns. Any other entry requires
    // reviewer scrutiny.
    expect(ALLOWED).toEqual(["src/__tests__/no-legacy-toast.test.ts"]);
  });
});
