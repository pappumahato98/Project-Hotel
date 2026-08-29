/**
 * Regression test: no inline queryKey literals in src/hooks/*.ts.
 *
 * This test enforces the central `queryKeys` factory pattern by scanning
 * every hook file for inline `queryKey: ["..."]` literals. If any are
 * found, the test fails with a list of offenders.
 *
 * Run with: pnpm vitest run src/__tests__/no-inline-query-keys.test.ts
 *
 * To add a new query family:
 *   1. Add it to `src/lib/queryKeys.ts`.
 *   2. Use it in the hook: `queryKey: queryKeys.family.member`.
 *
 * To temporarily bypass (NOT RECOMMENDED):
 *   - Add the hook path to the `ALLOWED_INLINE` set below with a comment
 *     explaining why. Reviewer must validate the reason.
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const HOOKS_DIR = path.resolve(__dirname, "..", "hooks");

// Files allowed to keep inline keys (e.g. third-party generated code).
// Add a comment per entry explaining why.
const ALLOWED_INLINE: string[] = [
  // None currently. Add here ONLY if a hook genuinely cannot use the factory.
];

function listHookFiles(): string[] {
  return fs
    .readdirSync(HOOKS_DIR)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => path.join(HOOKS_DIR, f));
}

function findInlineQueryKeys(filePath: string): string[] {
  const src = fs.readFileSync(filePath, "utf8");
  const matches: string[] = [];
  // Match `queryKey: ["...` (literal first element only — these are the
  // ones the factory should replace). Skip dynamic keys like `["x", variable]`
  // which the factory handles via `.byX(variable)` accessors.
  const regex = /queryKey:\s*\[\s*["'`]([^"'`]+)["'`]/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(src)) !== null) {
    matches.push(m[1]);
  }
  return matches;
}

describe("no inline queryKey literals in hooks", () => {
  it("all hooks use the central queryKeys factory", () => {
    const offenders: Array<{ file: string; keys: string[] }> = [];
    for (const file of listHookFiles()) {
      const rel = path.relative(process.cwd(), file);
      if (ALLOWED_INLINE.includes(rel)) continue;
      const keys = findInlineQueryKeys(file);
      if (keys.length > 0) {
        offenders.push({ file: rel, keys });
      }
    }

    if (offenders.length > 0) {
      const message = [
        "Found inline queryKey literals in hooks. Use the central `queryKeys` factory instead.",
        "",
        "Offenders:",
        ...offenders.map((o) => `  ${o.file}: ${o.keys.join(", ")}`),
        "",
        "Fix: import { queryKeys } from \"@/lib/queryKeys\"; and use queryKeys.family.member",
        "instead of queryKey: [\"family\"].",
      ].join("\n");
      expect.fail(message);
    }
  });

  it("the ALLOWED_INLINE list is empty or has comments (smoke check)", () => {
    // This test exists to make reviewers think twice before adding entries.
    // If you add an entry, you must also update this test to match.
    expect(ALLOWED_INLINE.length).toBe(0);
  });
});
