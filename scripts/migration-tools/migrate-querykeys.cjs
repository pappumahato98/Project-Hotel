#!/usr/bin/env node
/**
 * Generic codemod: migrate a single hook file from inline queryKey literals
 * to the central `queryKeys` factory.
 *
 * Usage:
 *   node scripts/migration-tools/migrate-querykeys.cjs <hook-file.ts>
 *
 * The script:
 *   1. Adds `import { queryKeys } from "@/lib/queryKeys";` if missing.
 *   2. Replaces inline `queryKey: ["family"]` and `queryKey: ["family", arg]`
 *      with the corresponding factory call, using a built-in key map.
 *   3. Replaces `queryClient.invalidateQueries({ queryKey: ["..."] })` calls
 *      the same way.
 *
 * The key map covers every query key used in src/hooks/*.ts. If a key is not
 * in the map, the script prints a warning and leaves it inline for manual
 * review.
 *
 * Idempotent: re-running on an already-migrated file is a no-op.
 *
 * NOT a silver bullet — always review the diff before committing.
 */

const fs = require("fs");
const path = require("path");

// ─── Key map ─────────────────────────────────────────────────────────
// Maps the literal first-element string to a factory accessor expression.
// For parameterized keys (e.g. `["guest", guestId]`), the accessor is a
// function call wrapped in `${}` so we can interpolate the second arg.
//
// Format:
//   "literal": {
//     bare: "queryKeys.family.member",                 // for ["literal"]
//     param: "queryKeys.family.member(${arg})",        // for ["literal", arg]
//   }
//
// `bare` is used when the array has exactly one element.
// `param` is used when the array has two elements; `${arg}` is replaced
// with the second element verbatim.

const KEY_MAP = {
  // ─── Reservations & Front Desk ────────────────────────────────────
  "reservations": {
    bare: "queryKeys.reservations.all",
    param: "queryKeys.reservations.all", // reservations has no .byX(id); fallback
  },
  "rooms": {
    bare: "queryKeys.rooms.all",
    param: "queryKeys.rooms.one(${arg})",
  },
  "room": {
    bare: "queryKeys.rooms.all",
    param: "queryKeys.rooms.one(${arg})",
  },
  "guests": {
    bare: "queryKeys.guests.all",
    param: "queryKeys.guests.one(${arg})",
  },
  "guest": {
    bare: "queryKeys.guests.all",
    param: "queryKeys.guests.one(${arg})",
  },
  "guest_folios": { bare: "queryKeys.guests.folios" },
  "folio_items": {
    bare: "queryKeys.guests.folioItems.all",
    param: "queryKeys.guests.folioItems.byFolio(${arg})",
  },
  "routing_rules": {
    bare: "queryKeys.guests.routingRules.all",
    param: "queryKeys.guests.routingRules.byFolio(${arg})",
  },
  "guest-feedback": {
    bare: "queryKeys.guests.feedback.all",
    param: "queryKeys.guests.feedback.filtered(${arg})",
  },
  "guest-preferences": { param: "queryKeys.guests.preferences(${arg})" },
  "guest-communications": { param: "queryKeys.guests.communications(${arg})" },
  "guest-documents": { param: "queryKeys.guests.documents(${arg})" },
  "guest_messages": { bare: "queryKeys.guests.messages" },
  "front_desk_queue": { bare: "queryKeys.frontDesk.queue" },
  "key-card-logs": { bare: "queryKeys.frontDesk.keyCardLogs" },
  "wake-up-calls": { bare: "queryKeys.frontDesk.wakeUpCalls" },

  // ─── Finance ──────────────────────────────────────────────────────
  "accounts": { bare: "queryKeys.finance.accounts" },
  "journal-entries": {
    bare: "queryKeys.finance.journalEntries.all",
    param: "queryKeys.finance.journalEntries.filtered(${arg})",
  },
  "ledger": {
    bare: "queryKeys.finance.ledger.all",
    param: "queryKeys.finance.ledger.byAccount(${arg})",
  },
  "trial-balance": { param: "queryKeys.finance.trialBalance(${arg})" },
  "invoices": {
    bare: "queryKeys.finance.invoices.all",
    param: "queryKeys.finance.invoices.filtered(${arg})",
  },
  "invoices-list": { bare: "queryKeys.finance.invoices.list" },
  "expenses": {
    bare: "queryKeys.finance.expenses.all",
    param: "queryKeys.finance.expenses.filtered(${arg})",
  },
  "payments": {
    bare: "queryKeys.finance.payments.all",
    param: "queryKeys.finance.payments.filtered(${arg})",
  },
  "payments-list": { bare: "queryKeys.finance.payments.list" },
  "billing-stats": { bare: "queryKeys.finance.billing.stats" },
  "budgets": { bare: "queryKeys.finance.budgets" },
  "tax-rates": { bare: "queryKeys.finance.taxRates" },
  "tax_rates": { bare: "queryKeys.finance.taxRatesLegacy" },
  "fixed-assets": { bare: "queryKeys.finance.fixedAssets" },
  "financial-periods": { bare: "queryKeys.finance.financialPeriods" },
  "approval-queue": {
    bare: "queryKeys.finance.approvalQueue.all",
    param: "queryKeys.finance.approvalQueue.filtered(${arg})",
  },

  // ─── POS ──────────────────────────────────────────────────────────
  "pos-tables": { bare: "queryKeys.pos.tables" },
  "pos-orders": {
    bare: "queryKeys.pos.orders.all",
    param: "queryKeys.pos.orders.byTable(${arg})",
  },
  "pos-transactions": {
    bare: "queryKeys.pos.transactions.all",
    param: "queryKeys.pos.transactions.filtered(${arg})",
  },
  "pos-menu-items": { bare: "queryKeys.pos.menuItems" },
  "pos-menu-categories": { bare: "queryKeys.pos.menuCategories" },
  "pos-companies": {
    bare: "queryKeys.pos.companies.all",
    param: "queryKeys.pos.companies.filtered(${arg})",
  },
  "time-clock": {
    bare: "queryKeys.pos.timeClock.all",
    param: "queryKeys.pos.timeClock.byDate(${arg})",
  },

  // ─── Banquet & Events ─────────────────────────────────────────────
  "banquet-events": { bare: "queryKeys.banquet.events" },
  "event-catering": {
    bare: "queryKeys.banquet.catering.all",
    param: "queryKeys.banquet.catering.byEvent(${arg})",
  },
  "event-venue-setups": {
    bare: "queryKeys.banquet.venueSetups.all",
    param: "queryKeys.banquet.venueSetups.byEvent(${arg})",
  },
  "event-staff-assignments": {
    bare: "queryKeys.banquet.staffAssignments.all",
    param: "queryKeys.banquet.staffAssignments.byEvent(${arg})",
  },

  // ─── Housekeeping & Operations ────────────────────────────────────
  "housekeeping-tasks": {
    bare: "queryKeys.housekeeping.tasks.all",
    param: "queryKeys.housekeeping.tasks.filtered(${arg})",
  },
  "housekeeping-rooms-status": { bare: "queryKeys.housekeeping.roomsStatus" },
  "housekeeping-inspections": {
    bare: "queryKeys.housekeeping.inspections.all",
    param: "queryKeys.housekeeping.inspections.byRoom(${arg})",
  },
  "lost-and-found": {
    bare: "queryKeys.housekeeping.lostAndFound.all",
    param: "queryKeys.housekeeping.lostAndFound.byStatus(${arg})",
  },
  "maintenance-requests": { bare: "queryKeys.maintenance.requests" },

  // ─── HR & Staff ───────────────────────────────────────────────────
  "staff-members": { bare: "queryKeys.hr.staffMembers" },
  "staff-departments": { bare: "queryKeys.hr.departments" },
  "staff-schedules": {
    bare: "queryKeys.hr.schedules.all",
    param: "queryKeys.hr.schedules.filtered(${arg})",
  },
  "leave-requests": {
    bare: "queryKeys.hr.leaveRequests.all",
    param: "queryKeys.hr.leaveRequests.filtered(${arg})",
  },
  "leave-balances": {
    bare: "queryKeys.hr.leaveBalances.all",
    param: "queryKeys.hr.leaveBalances.byStaff(${arg})",
  },
  "payroll-records": {
    bare: "queryKeys.hr.payroll.all",
    param: "queryKeys.hr.payroll.filtered(${arg})",
  },

  // ─── Loyalty & Marketing ──────────────────────────────────────────
  "loyalty-members": {
    bare: "queryKeys.loyalty.members.all",
    param: "queryKeys.loyalty.members.byTier(${arg})",
  },
  "loyalty-transactions": {
    bare: "queryKeys.loyalty.transactions.all",
    param: "queryKeys.loyalty.transactions.byMember(${arg})",
  },
  "marketing_inquiries": { bare: "queryKeys.marketing.inquiries" },
  "sales_activities": { bare: "queryKeys.marketing.activities" },
  "customers": { bare: "queryKeys.marketing.customers" },

  // ─── Channel Manager (OTA) ────────────────────────────────────────
  "ota-channels": { bare: "queryKeys.channelManager.channels" },
  "ota-sync-logs": { bare: "queryKeys.channelManager.syncLogs" },
  "rate-availability": {
    bare: "queryKeys.channelManager.rateAvailability.all",
    param: "queryKeys.channelManager.rateAvailability.filtered(${arg})",
  },
  "rate_plans": { bare: "queryKeys.channelManager.ratePlans" },

  // ─── Reports & Dashboard ──────────────────────────────────────────
  "report-stats": { bare: "queryKeys.reports.stats" },
  "management_kpis": { param: "queryKeys.reports.managementKpis(${arg})" },
  "dashboard-stats": { bare: "queryKeys.reports.dashboardStats" },

  // ─── Settings & Notifications ─────────────────────────────────────
  "settings": {
    bare: "queryKeys.settings.all",
    param: "queryKeys.settings.key(${arg})", // for ["settings", key]
  },
  "message-templates": { bare: "queryKeys.messageTemplates" },
  "notifications": { bare: "queryKeys.notifications" },

  // ─── Auth & RBAC ──────────────────────────────────────────────────
  "users-with-roles": { bare: "queryKeys.users.all" },
  "users-with-multiple-roles": { bare: "queryKeys.users.multipleRoles" },
  "user-role": { param: "queryKeys.users.role(${arg})" },
  "role-permissions": { bare: "queryKeys.users.rolePermissions" },
  "role-change-audit": { bare: "queryKeys.users.roleChangeAudit" },
  "admin-audit-logs": { bare: "queryKeys.users.adminAuditLogs" },
  "security-audit-logs": { bare: "queryKeys.users.securityAuditLogs" },

  // ─── Security monitor (single-quote variant) ─────────────────────
  "security-auth-metrics": { bare: "queryKeys.security.authMetrics" },
  "security-monitor-events": { bare: "queryKeys.security.monitorEvents" },
};

// ─── Special-case: ["settings", "business_date"] etc. ────────────────
const SETTINGS_NAMED = {
  "business_date": "queryKeys.settings.businessDate",
  "property_info": "queryKeys.settings.propertyInfo",
  "room_types": "queryKeys.settings.roomTypes",
  "payment_gateways": "queryKeys.settings.paymentGateways",
};

// ─── Helpers ─────────────────────────────────────────────────────────

function ensureImport(src) {
  if (src.includes('@/lib/queryKeys')) return src;
  // Insert after the last existing "@/..." import line.
  const lines = src.split("\n");
  let lastImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^import\s+.*from\s+["']@\/.*["'];?\s*$/)) {
      lastImportIdx = i;
    }
  }
  if (lastImportIdx === -1) {
    // Fallback: insert before the first non-import statement.
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].startsWith("import") && lines[i].trim() !== "") {
        lastImportIdx = i - 1;
        break;
      }
    }
  }
  lines.splice(
    lastImportIdx + 1,
    0,
    'import { queryKeys } from "@/lib/queryKeys";'
  );
  return lines.join("\n");
}

function replaceKeyArray(match, inner) {
  // `match` is the full `queryKey: [...]` substring.
  // `inner` is the array contents without brackets.
  const trimmed = inner.trim();
  if (!trimmed) return match; // empty array, skip

  // Split on top-level commas (no nested arrays expected here).
  // We need to be careful about commas inside string literals, but query
  // keys here are simple: ["foo"] or ["foo", varName] or ["foo", "bar"].
  // For the special ["settings", "named_key"] case, both elements are strings.
  const parts = [];
  let depth = 0, cur = "", inStr = false, strCh = "";
  for (const ch of trimmed) {
    if (inStr) {
      cur += ch;
      if (ch === strCh && cur[cur.length - 2] !== "\\") inStr = false;
    } else if (ch === '"' || ch === "'") {
      inStr = true; strCh = ch; cur += ch;
    } else if (ch === "[") { depth++; cur += ch;
    } else if (ch === "]") { depth--; cur += ch;
    } else if (ch === "," && depth === 0) { parts.push(cur.trim()); cur = "";
    } else { cur += ch; }
  }
  if (cur.trim()) parts.push(cur.trim());

  if (parts.length === 0) return match;

  // Extract the first literal string.
  const firstRaw = parts[0];
  const firstMatch = firstRaw.match(/^["']([^"']+)["']$/);
  if (!firstMatch) return match; // first element isn't a literal string
  const first = firstMatch[1];

  // Special-case: ["settings", "named_key"]
  if (first === "settings" && parts.length === 2) {
    const secondRaw = parts[1];
    const secondMatch = secondRaw.match(/^["']([^"']+)["']$/);
    if (secondMatch && SETTINGS_NAMED[secondMatch[1]]) {
      return `queryKey: ${SETTINGS_NAMED[secondMatch[1]]}`;
    }
  }

  // Special-case: ["reservations", "pending", date] and ["reservations", "stayovers", date]
  if (first === "reservations" && parts.length >= 2) {
    const secondRaw = parts[1];
    const secondMatch = secondRaw.match(/^["']([^"']+)["']$/);
    if (secondMatch && (secondMatch[1] === "pending" || secondMatch[1] === "stayovers")) {
      const mode = secondMatch[1]; // "pending" or "stayovers"
      if (parts.length === 3) {
        return `queryKey: queryKeys.reservations.${mode}(${parts[2]})`;
      }
      return `queryKey: queryKeys.reservations.${mode}()`;
    }
  }

  const entry = KEY_MAP[first];
  if (!entry) {
    console.warn(`  ⚠ no mapping for key "${first}" — leaving inline`);
    return match;
  }

  if (parts.length === 1) {
    if (!entry.bare) {
      console.warn(`  ⚠ no bare mapping for key "${first}" — leaving inline`);
      return match;
    }
    return `queryKey: ${entry.bare}`;
  }
  if (parts.length === 2) {
    if (!entry.param) {
      console.warn(`  ⚠ no param mapping for key "${first}" — leaving inline`);
      return match;
    }
    return `queryKey: ${entry.param.replace("${arg}", parts[1])}`;
  }
  // 3+ elements: not in our map.
  console.warn(`  ⚠ key "${first}" has ${parts.length} elements — leaving inline`);
  return match;
}

function migrateFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  let src = fs.readFileSync(filePath, "utf8");
  const before = src;

  // Match `queryKey: [...]` (allowing nested arrays/objects minimally).
  // We use a permissive regex and let replaceKeyArray decide whether to act.
  src = src.replace(/queryKey:\s*\[([^\]]*)\]/g, (m, inner) => replaceKeyArray(m, inner));

  // Only add the import if we actually made a replacement.
  if (src !== before) {
    src = ensureImport(src);
    fs.writeFileSync(filePath, src);
    console.log(`✓ Migrated ${path.relative(process.cwd(), filePath)}`);
  } else {
    console.log(`  No changes: ${path.relative(process.cwd(), filePath)}`);
  }
}

// ─── CLI ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: migrate-querykeys.cjs <file.ts> [file2.ts ...]");
  console.error("       migrate-querykeys.cjs --all         (migrate every src/hooks/*.ts)");
  process.exit(1);
}

if (args[0] === "--all") {
  const dir = path.resolve(__dirname, "..", "..", "src/hooks");
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => path.join(dir, f));
  for (const f of files) migrateFile(f);
} else {
  for (const f of args) migrateFile(path.resolve(f));
}
