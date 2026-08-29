/**
 * Centralized TanStack Query key factory.
 *
 * Why: query-key strings were previously scattered as inline literals
 * (`["reservations"]`, `["guest_folios"]`, etc.) across 50+ hooks. Typos
 * and silent drift caused realtime invalidations to miss cache entries,
 * producing stale UI. This factory is the single source of truth.
 *
 * Rules of use:
 *   1. ALWAYS import from `@/lib/queryKeys` — never write `queryKey: ["..."]` inline.
 *   2. The factory returns ARRAYS. Pass them verbatim to `useQuery({ queryKey })`
 *      or `queryClient.invalidateQueries({ queryKey })`.
 *   3. For parameterized keys, call the function with the params:
 *         queryKey: queryKeys.ledger.byAccount(accountId, filters)
 *   4. To invalidate a whole family, use the `.all` member:
 *         queryClient.invalidateQueries({ queryKey: queryKeys.ledger.all })
 *   5. When adding a new resource, add it here first, then use it in the hook.
 *
 * Convention: family names are kebab-case plural; sub-keys are `by<Field>(...)`
 * for parameterized queries and `all` for the family root.
 */

import type { QueryKey } from "@tanstack/react-query";

/** Helper for filter-shaped sub-keys (stable JSON representation). */
function filterKey(f: unknown): QueryKey {
  if (!f) return [];
  // Sort keys for stable serialization. Skip if not a plain object.
  if (typeof f === "object" && !Array.isArray(f)) {
    const sorted = Object.keys(f as Record<string, unknown>)
      .sort()
      .map((k) => [k, (f as Record<string, unknown>)[k]]);
    return sorted as unknown as QueryKey;
  }
  return [f as QueryKey];
}

export const queryKeys = {
  // ─── Auth & RBAC ────────────────────────────────────────────────
  users: {
    all: ["users-with-roles"] as const,
    multipleRoles: ["users-with-multiple-roles"] as const,
    role: (userId: string | undefined) => ["user-role", userId] as const,
    rolePermissions: ["role-permissions"] as const,
    roleChangeAudit: ["role-change-audit"] as const,
    adminAuditLogs: ["admin-audit-logs"] as const,
    securityAuditLogs: ["security-audit-logs"] as const,
  },

  // ─── Reservations & Front Desk ─────────────────────────────────
  reservations: {
    all: ["reservations"] as const,
    pending: (date?: string) =>
      date ? (["reservations", "pending", date] as const) : (["reservations", "pending"] as const),
    stayovers: (date?: string) =>
      date ? (["reservations", "stayovers", date] as const) : (["reservations", "stayovers"] as const),
  },
  rooms: {
    all: ["rooms"] as const,
    one: (roomId: string) => ["room", roomId] as const,
  },
  guests: {
    all: ["guests"] as const,
    one: (guestId: string) => ["guest", guestId] as const,
    folios: ["guest_folios"] as const,
    folioItems: {
      all: ["folio_items"] as const,
      byFolio: (folioId: string) => ["folio_items", folioId] as const,
    },
    routingRules: {
      all: ["routing_rules"] as const,
      byFolio: (folioId: string) => ["routing_rules", folioId] as const,
    },
    feedback: {
      all: ["guest-feedback"] as const,
      filtered: (f: unknown) => ["guest-feedback", ...filterKey(f)] as const,
    },
    preferences: (guestId: string) => ["guest-preferences", guestId] as const,
    communications: (guestId: string) => ["guest-communications", guestId] as const,
    documents: (guestId: string) => ["guest-documents", guestId] as const,
    messages: ["guest_messages"] as const,
  },
  frontDesk: {
    queue: ["front_desk_queue"] as const,
    keyCardLogs: ["key-card-logs"] as const,
    wakeUpCalls: ["wake-up-calls"] as const,
  },

  // ─── Finance ───────────────────────────────────────────────────
  finance: {
    accounts: ["accounts"] as const,
    journalEntries: {
      all: ["journal-entries"] as const,
      filtered: (f: unknown) => ["journal-entries", ...filterKey(f)] as const,
    },
    ledger: {
      all: ["ledger"] as const,
      byAccount: (accountId?: string, f?: unknown) =>
        accountId ? (["ledger", accountId, ...filterKey(f)] as const) : (["ledger", ...filterKey(f)] as const),
    },
    trialBalance: (asOfDate: string) => ["trial-balance", asOfDate] as const,
    invoices: {
      all: ["invoices"] as const,
      list: ["invoices-list"] as const,
      filtered: (f: unknown) => ["invoices", ...filterKey(f)] as const,
    },
    expenses: {
      all: ["expenses"] as const,
      filtered: (f: unknown) => ["expenses", ...filterKey(f)] as const,
    },
    payments: {
      all: ["payments"] as const,
      list: ["payments-list"] as const,
      filtered: (f: unknown) => ["payments", ...filterKey(f)] as const,
    },
    billing: {
      stats: ["billing-stats"] as const,
    },
    budgets: ["budgets"] as const,
    taxRates: ["tax-rates"] as const,
    taxRatesLegacy: ["tax_rates"] as const,
    fixedAssets: ["fixed-assets"] as const,
    financialPeriods: ["financial-periods"] as const,
    approvalQueue: {
      all: ["approval-queue"] as const,
      filtered: (statusFilter: unknown) => ["approval-queue", statusFilter] as const,
    },
  },

  // ─── POS ───────────────────────────────────────────────────────
  pos: {
    tables: ["pos-tables"] as const,
    orders: {
      all: ["pos-orders"] as const,
      byTable: (tableId: string) => ["pos-orders", tableId] as const,
    },
    transactions: {
      all: ["pos-transactions"] as const,
      filtered: (f: unknown) => ["pos-transactions", ...filterKey(f)] as const,
    },
    menuItems: ["pos-menu-items"] as const,
    menuCategories: ["pos-menu-categories"] as const,
    companies: {
      all: ["pos-companies"] as const,
      filtered: (searchTerm: unknown) => ["pos-companies", searchTerm] as const,
    },
    timeClock: {
      all: ["time-clock"] as const,
      byDate: (date: string) => ["time-clock", date] as const,
    },
  },

  // ─── Inventory ─────────────────────────────────────────────────
  // Inventory hooks live in src/hooks/inventory/ and have their own
  // service-layer keys. Add them here as the inventory module migrates.

  // ─── Banquet & Events ──────────────────────────────────────────
  banquet: {
    events: ["banquet-events"] as const,
    catering: {
      all: ["event-catering"] as const,
      byEvent: (eventId: string) => ["event-catering", eventId] as const,
    },
    venueSetups: {
      all: ["event-venue-setups"] as const,
      byEvent: (eventId: string) => ["event-venue-setups", eventId] as const,
    },
    staffAssignments: {
      all: ["event-staff-assignments"] as const,
      byEvent: (eventId: string) => ["event-staff-assignments", eventId] as const,
    },
  },

  // ─── Housekeeping & Operations ─────────────────────────────────
  housekeeping: {
    tasks: {
      all: ["housekeeping-tasks"] as const,
      filtered: (f: unknown) => ["housekeeping-tasks", ...filterKey(f)] as const,
    },
    roomsStatus: ["housekeeping-rooms-status"] as const,
    inspections: {
      all: ["housekeeping-inspections"] as const,
      byRoom: (roomId: string) => ["housekeeping-inspections", roomId] as const,
    },
    lostAndFound: {
      all: ["lost-and-found"] as const,
      byStatus: (status: unknown) => ["lost-and-found", status] as const,
    },
  },
  maintenance: {
    requests: ["maintenance-requests"] as const,
  },

  // ─── HR & Staff ────────────────────────────────────────────────
  hr: {
    staffMembers: ["staff-members"] as const,
    departments: ["staff-departments"] as const,
    schedules: {
      all: ["staff-schedules"] as const,
      filtered: (f: unknown) => ["staff-schedules", ...filterKey(f)] as const,
    },
    leaveRequests: {
      all: ["leave-requests"] as const,
      filtered: (f: unknown) => ["leave-requests", ...filterKey(f)] as const,
    },
    leaveBalances: {
      all: ["leave-balances"] as const,
      byStaff: (staffId: string) => ["leave-balances", staffId] as const,
    },
    payroll: {
      all: ["payroll-records"] as const,
      filtered: (f: unknown) => ["payroll-records", ...filterKey(f)] as const,
    },
  },

  // ─── Loyalty & Marketing ───────────────────────────────────────
  loyalty: {
    members: {
      all: ["loyalty-members"] as const,
      byTier: (tier: unknown) => ["loyalty-members", tier] as const,
    },
    transactions: {
      all: ["loyalty-transactions"] as const,
      byMember: (memberId: string) => ["loyalty-transactions", memberId] as const,
    },
  },
  marketing: {
    inquiries: ["marketing_inquiries"] as const,
    activities: ["sales_activities"] as const,
    customers: ["customers"] as const,
  },

  // ─── Channel Manager (OTA) ─────────────────────────────────────
  channelManager: {
    channels: ["ota-channels"] as const,
    syncLogs: ["ota-sync-logs"] as const,
    rateAvailability: {
      all: ["rate-availability"] as const,
      filtered: (f: unknown) => ["rate-availability", ...filterKey(f)] as const,
    },
    ratePlans: ["rate_plans"] as const,
  },

  // ─── Reports & Dashboard ───────────────────────────────────────
  reports: {
    stats: ["report-stats"] as const,
    managementKpis: (dateStr: string) => ["management_kpis", dateStr] as const,
    dashboardStats: ["dashboard-stats"] as const,
  },

  // ─── Settings & Notifications ──────────────────────────────────
  settings: {
    all: ["settings"] as const,
    businessDate: ["settings", "business_date"] as const,
    paymentGateways: ["settings", "payment_gateways"] as const,
    propertyInfo: ["settings", "property_info"] as const,
    roomTypes: ["settings", "room_types"] as const,
    key: (k: string) => ["settings", k] as const,
  },
  notifications: ["notifications"] as const,
  messageTemplates: ["message-templates"] as const,

  // ─── Security monitor (single-quote variant) ───────────────────
  security: {
    authMetrics: ["security-auth-metrics"] as const,
    monitorEvents: ["security-monitor-events"] as const,
  },
} as const;

/** Type helper for partial invalidation by family prefix. */
export type QueryKeyFamily = keyof typeof queryKeys;
