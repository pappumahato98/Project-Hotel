#!/usr/bin/env node
/**
 * One-shot codemod: migrate useFrontDeskSetup.ts from useToast → sonner
 * and inline query keys → queryKeys factory.
 *
 * Run with: node scripts/migration-tools/migrate-useFrontDeskSetup.js
 * Idempotent: re-running on an already-migrated file is a no-op.
 */

const fs = require("fs");
const path = require("path");

const FILE = path.resolve(
  __dirname,
  "..",
  "..",
  "src/hooks/useFrontDeskSetup.ts"
);

if (!fs.existsSync(FILE)) {
  console.error(`File not found: ${FILE}`);
  process.exit(1);
}

let src = fs.readFileSync(FILE, "utf8");
const before = src;

// 1. Replace import line.
src = src.replace(
  /import \{ useToast \} from "@\/hooks\/use-toast";\n/,
  'import { toast } from "sonner";\nimport { queryKeys } from "@/lib/queryKeys";\n'
);

// 2. Remove `const { toast } = useToast();` line.
src = src.replace(/const \{ toast \} = useToast\(\);\n\s*/, "");

// 3. Replace toast({ title: "Success", description: "X" }) → toast.success("X")
//    (no, wait — title is "Success", description is the actual message)
//    Better: toast({ title: "Success", description: "X" }) → toast.success("X")
src = src.replace(
  /toast\(\{ title: "Success", description: "([^"]+)" \}\);/g,
  'toast.success("$1");'
);

// 4. Replace toast({ title: "Error", description: X, variant: "destructive" })
//    → toast.error("Error", { description: X })
src = src.replace(
  /toast\(\{ title: "Error", description: ([^,}]+), variant: "destructive" \}\);/g,
  'toast.error("Error", { description: $1 });'
);

// 5. Replace toast({ title: "X", description: "Y" })
//    → toast.success("X", { description: "Y" })
src = src.replace(
  /toast\(\{\s*title: "([^"]+)",\s*description: "([^"]+)",?\s*\}\);/g,
  'toast.success("$1", { description: "$2" });'
);

// 6. Replace toast({ title: "X" }) → toast.success("X")
src = src.replace(/toast\(\{ title: "([^"]+)" \}\);/g, 'toast.success("$1");');

// 7. Replace inline query keys.
//    `queryKey: ["settings", "business_date"]` → `queryKey: queryKeys.settings.businessDate`
src = src.replace(
  /queryKey: \["settings", "business_date"\],/g,
  "queryKey: queryKeys.settings.businessDate,"
);
src = src.replace(
  /queryKey: \["settings", "property_info"\],/g,
  "queryKey: queryKeys.settings.propertyInfo,"
);
src = src.replace(
  /queryKey: \["settings", "room_types"\],/g,
  "queryKey: queryKeys.settings.roomTypes,"
);
src = src.replace(
  /queryKey: \["rate_plans"\],/g,
  "queryKey: queryKeys.channelManager.ratePlans,"
);
src = src.replace(
  /queryKey: \["tax_rates"\],/g,
  "queryKey: queryKeys.finance.taxRatesLegacy,"
);

// 8. Replace `queryClient.invalidateQueries({ queryKey: ["X", Y] })` and
//    `queryClient.invalidateQueries({ queryKey: ["X"] })` patterns.
src = src.replace(
  /queryClient\.invalidateQueries\(\{ queryKey: \["settings", "business_date"\] \}\);/g,
  "queryClient.invalidateQueries({ queryKey: queryKeys.settings.businessDate });"
);
src = src.replace(
  /queryClient\.invalidateQueries\(\{ queryKey: \["settings", "property_info"\] \}\);/g,
  "queryClient.invalidateQueries({ queryKey: queryKeys.settings.propertyInfo });"
);
src = src.replace(
  /queryClient\.invalidateQueries\(\{ queryKey: \["settings", "room_types"\] \}\);/g,
  "queryClient.invalidateQueries({ queryKey: queryKeys.settings.roomTypes });"
);
src = src.replace(
  /queryClient\.invalidateQueries\(\{ queryKey: \["rate_plans"\] \}\);/g,
  "queryClient.invalidateQueries({ queryKey: queryKeys.channelManager.ratePlans });"
);
src = src.replace(
  /queryClient\.invalidateQueries\(\{ queryKey: \["tax_rates"\] \}\);/g,
  "queryClient.invalidateQueries({ queryKey: queryKeys.finance.taxRatesLegacy });"
);

// 9. Replace `queryKey: ["settings", key]` (parameterized) → `queryKey: queryKeys.settings.key(key)`
src = src.replace(
  /queryKey: \["settings", key\],/g,
  "queryKey: queryKeys.settings.key(key),"
);
src = src.replace(
  /queryClient\.invalidateQueries\(\{ queryKey: \["settings", key\] \}\);/g,
  "queryClient.invalidateQueries({ queryKey: queryKeys.settings.key(key) });"
);

if (src === before) {
  console.log("No changes — file may already be migrated.");
} else {
  fs.writeFileSync(FILE, src);
  console.log(`Migrated ${path.relative(process.cwd(), FILE)}`);
  console.log(`  Bytes: ${before.length} → ${src.length}`);
}
