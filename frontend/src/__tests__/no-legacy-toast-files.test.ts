/**
 * Regression test: legacy toast files must not be re-created.
 *
 * The following files were deleted when the project migrated to `sonner`:
 *   - src/hooks/use-toast.ts
 *   - src/components/ui/toast.tsx
 *   - src/components/ui/toaster.tsx
 *   - src/components/ui/use-toast.ts
 *
 * This test ensures they don't get re-introduced (e.g. by a contributor
 * running `npx shadcn-ui@latest add toast`).
 *
 * Run with: pnpm vitest run src/__tests__/no-legacy-toast-files.test.ts
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

const DELETED_FILES = [
  "hooks/use-toast.ts",
  "components/ui/toast.tsx",
  "components/ui/toaster.tsx",
  "components/ui/use-toast.ts",
];

describe("legacy toast files must not be re-created", () => {
  for (const rel of DELETED_FILES) {
    it(`${rel} does not exist`, () => {
      const full = path.join(ROOT, rel);
      if (fs.existsSync(full)) {
        expect.fail(
          `Legacy file ${rel} exists. It was deleted when migrating to sonner. ` +
            `Use sonner directly: import { toast } from "sonner";`
        );
      }
    });
  }
});
