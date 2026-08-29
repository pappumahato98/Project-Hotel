import { useState } from 'react';
import { FinanceRole, MATRIX_DATA, FINANCE_ROLES } from '../components/finance/PermissionMatrix';

// Mapping between Master List titles and Matrix Item names
const PERMISSION_MAPPING: Record<string, string> = {
  // Setup
  "Chart of Accounts configuration": "Chart of Accounts",
  "Account hierarchy and segments": "Chart of Accounts",
  "Fiscal year and accounting periods": "Fiscal Year/Periods",
  "Journal types and approval workflows": "Posting Rules",
  "Posting rules and module mappings": "Posting Rules",
  "Customer and corporate account setup": "Customer/Corp Setup",
  "Credit limits and customer terms": "Customer/Corp Setup",
  "Vendor master setup": "Vendor Master",
  "Bank account configuration": "Bank/Cash Setup",
  "Cash register setup": "Bank/Cash Setup",
  "Asset categories and useful life settings": "Asset Categories",
  "Tax codes and slabs (VAT, GST, service tax)": "Tax Rules",
  "Budget templates": "Budget Templates",
  "Role-based permissions": "Role Permissions",

  // Transactions
  "Manual journal entries": "Manual Journals",
  "Recurring journals": "Manual Journals",
  "Reversing journal entries": "Reversing Journals",
  "Corporate/cash/OTA invoice generation": "AR Invoice Gen",
  "Payment receipts (cash, card, bank, cheque)": "Payment Receipts",
  "Dunning actions": "Dunning Actions",
  "Vendor invoice posting": "AP Invoice Posting",
  "Vendor payments (single or batch)": "Vendor Payments",
  "Bank reconciliation": "Bank Recon",
  "Depreciation run": "Asset Depr Run",
  "Financial period close and reopen": "Period Close",

  // Reports
  "Trial Balance": "Trial Balance",
  "Consolidated Balance Sheet": "Financial Stmts",
  "Consolidated Profit & Loss": "Financial Stmts",
  "AR Aging": "AR Aging",
  "AP Aging": "AP Aging",
  "Asset register": "Asset Register",
  "Tax summary (sales/purchase)": "Tax Summary",
  "Budget vs Actual": "Budget Variance",
  "Audit logs": "Audit Logs"
};

export const useFinancePermissions = (initialRole: FinanceRole = 'FA') => {
  const [activeRole, setActiveRole] = useState<FinanceRole>(initialRole);

  const checkPermission = (itemTitle: string) => {
    const matrixItemName = PERMISSION_MAPPING[itemTitle];
    if (!matrixItemName) return 'full';

    const row = MATRIX_DATA.find(d => d.item === matrixItemName);
    if (!row) return 'full';

    return row.permissions[activeRole];
  };

  const canView = (itemTitle: string) => {
    const perm = checkPermission(itemTitle);
    return perm === 'full' || perm === 'view';
  };

  const canEdit = (itemTitle: string) => {
    const perm = checkPermission(itemTitle);
    return perm === 'full';
  };

  const roleLabel = FINANCE_ROLES[activeRole].label;

  return {
    activeRole,
    setActiveRole,
    canView,
    canEdit,
    checkPermission,
    roleLabel
  };
};
