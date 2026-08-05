import { db } from "../src/lib/db";
import { Prisma } from "@prisma/client";

async function main() {
  console.log("🌱 Seeding accounting data...\n");

  // ═══════════════════════════════════════════════════════════════
  // 1. CHART OF ACCOUNTS (55 accounts)
  // ═══════════════════════════════════════════════════════════════
  console.log("📋 Creating Chart of Accounts (55 accounts)...");

  const accounts = await Promise.all(
    [
      // ── ASSETS (1xxx) ──────────────────────────────────────────
      { id: "acct-1000", code: "1000", name: "Cash", type: "asset", subtype: "cash", description: "Physical cash on hand", department: "Front Office" },
      { id: "acct-1010", code: "1010", name: "Petty Cash", type: "asset", subtype: "cash", description: "Small cash fund for minor expenses", department: "Front Office" },
      { id: "acct-1100", code: "1100", name: "Bank Account - Nabil", type: "asset", subtype: "bank", description: "Primary operating account at Nabil Bank", department: "Finance" },
      { id: "acct-1101", code: "1101", name: "Bank Account - NIC Asia", type: "asset", subtype: "bank", description: "Secondary operating account at NIC Asia Bank", department: "Finance" },
      { id: "acct-1200", code: "1200", name: "Accounts Receivable", type: "asset", subtype: "receivable", description: "Trade receivables from corporate clients", department: "Finance" },
      { id: "acct-1210", code: "1210", name: "Guest Ledger Receivable", type: "asset", subtype: "receivable", description: "Outstanding guest folio balances", department: "Front Office" },
      { id: "acct-1300", code: "1300", name: "Inventory - F&B", type: "asset", subtype: "current", description: "Food and beverage inventory stock", department: "F&B" },
      { id: "acct-1310", code: "1310", name: "Inventory - Housekeeping", type: "asset", subtype: "current", description: "Housekeeping supplies and amenities", department: "Housekeeping" },
      { id: "acct-1320", code: "1320", name: "Inventory - Spa", type: "asset", subtype: "current", description: "Spa products and treatment supplies", department: "Spa" },
      { id: "acct-1400", code: "1400", name: "Prepaid Expenses", type: "asset", subtype: "current", description: "Prepaid insurance, subscriptions, deposits", department: "Finance" },
      { id: "acct-1500", code: "1500", name: "Fixed Assets - Furniture", type: "asset", subtype: "non_current", description: "Hotel furniture and fixtures", department: "Administration" },
      { id: "acct-1510", code: "1510", name: "Fixed Assets - Equipment", type: "asset", subtype: "non_current", description: "Kitchen equipment, HVAC, laundry machines", department: "Engineering" },
      { id: "acct-1520", code: "1520", name: "Fixed Assets - Building", type: "asset", subtype: "non_current", description: "Hotel building and structure", department: "Administration" },
      { id: "acct-1530", code: "1530", name: "Accumulated Depreciation", type: "asset", subtype: "non_current", description: "Cumulative depreciation on fixed assets", department: "Finance" },
      { id: "acct-1600", code: "1600", name: "Security Deposit", type: "asset", subtype: "current", description: "Refundable security deposits paid", department: "Finance" },

      // ── LIABILITIES (2xxx) ──────────────────────────────────────
      { id: "acct-2000", code: "2000", name: "Accounts Payable", type: "liability", subtype: "payable", description: "Trade payables to suppliers and vendors", department: "Finance" },
      { id: "acct-2010", code: "2010", name: "Accrued Expenses", type: "liability", subtype: "payable", description: "Expenses incurred but not yet paid", department: "Finance" },
      { id: "acct-2020", code: "2020", name: "VAT Payable", type: "liability", subtype: "payable", description: "Output VAT collected from guests", department: "Finance" },
      { id: "acct-2030", code: "2030", name: "Payroll Payable", type: "liability", subtype: "payable", description: "Unpaid wages and salaries", department: "HR" },
      { id: "acct-2040", code: "2040", name: "Guest Deposits", type: "liability", subtype: "payable", description: "Advance deposits received from guests", department: "Front Office" },
      { id: "acct-2050", code: "2050", name: "Deferred Revenue", type: "liability", subtype: "payable", description: "Revenue received for future services", department: "Finance" },
      { id: "acct-2100", code: "2100", name: "Bank Loan", type: "liability", subtype: "current", description: "Short-term bank borrowings", department: "Finance" },
      { id: "acct-2110", code: "2110", name: "Loan Payable - Long Term", type: "liability", subtype: "non_current", description: "Long-term bank loan for property", department: "Finance" },

      // ── EQUITY (3xxx) ──────────────────────────────────────────
      { id: "acct-3000", code: "3000", name: "Owner's Capital", type: "equity", subtype: null, description: "Owner's equity investment", department: null },
      { id: "acct-3010", code: "3010", name: "Retained Earnings", type: "equity", subtype: null, description: "Accumulated retained profits", department: null },
      { id: "acct-3020", code: "3020", name: "Current Year Earnings", type: "equity", subtype: null, description: "Current fiscal year net income", department: null },
      { id: "acct-3030", code: "3030", name: "Dividends", type: "equity", subtype: null, description: "Dividends declared to owners", department: null },

      // ── REVENUE (4xxx) ─────────────────────────────────────────
      { id: "acct-4000", code: "4000", name: "Room Revenue", type: "revenue", subtype: null, description: "Revenue from room rentals", department: "Front Office" },
      { id: "acct-4010", code: "4010", name: "F&B Revenue", type: "revenue", subtype: null, description: "Revenue from restaurants and bars", department: "F&B" },
      { id: "acct-4020", code: "4020", name: "Event/Banquet Revenue", type: "revenue", subtype: null, description: "Revenue from events, conferences, banquets", department: "Events" },
      { id: "acct-4030", code: "4030", name: "Spa Revenue", type: "revenue", subtype: null, description: "Revenue from spa treatments and services", department: "Spa" },
      { id: "acct-4040", code: "4040", name: "Laundry Revenue", type: "revenue", subtype: null, description: "Revenue from guest laundry services", department: "Housekeeping" },
      { id: "acct-4050", code: "4050", name: "Other Revenue", type: "revenue", subtype: null, description: "Miscellaneous operating revenue", department: "Administration" },
      { id: "acct-4060", code: "4060", name: "Telephone/Internet Revenue", type: "revenue", subtype: null, description: "Revenue from telephone and internet charges", department: "Front Office" },
      { id: "acct-4070", code: "4070", name: "Parking Revenue", type: "revenue", subtype: null, description: "Revenue from parking services", department: "Front Office" },
      { id: "acct-4080", code: "4080", name: "Mini Bar Revenue", type: "revenue", subtype: null, description: "Revenue from in-room mini bar consumption", department: "F&B" },
      { id: "acct-4090", code: "4090", name: "Room Service Revenue", type: "revenue", subtype: null, description: "Revenue from in-room dining orders", department: "F&B" },

      // ── EXPENSES (5xxx) ────────────────────────────────────────
      { id: "acct-5000", code: "5000", name: "Cost of Goods Sold - F&B", type: "expense", subtype: null, description: "Cost of food and beverage ingredients", department: "F&B" },
      { id: "acct-5010", code: "5010", name: "Cost of Goods Sold - Bar", type: "expense", subtype: null, description: "Cost of alcoholic beverages and bar supplies", department: "F&B" },
      { id: "acct-5100", code: "5100", name: "Salaries & Wages", type: "expense", subtype: null, description: "All employee salaries and wages", department: "HR" },
      { id: "acct-5110", code: "5110", name: "Employee Benefits", type: "expense", subtype: null, description: "Provident fund, insurance, gratuity", department: "HR" },
      { id: "acct-5120", code: "5120", name: "Training Expenses", type: "expense", subtype: null, description: "Staff training and development costs", department: "HR" },
      { id: "acct-5200", code: "5200", name: "Utilities - Electricity", type: "expense", subtype: null, description: "Electricity bills for the property", department: "Engineering" },
      { id: "acct-5210", code: "5210", name: "Utilities - Water", type: "expense", subtype: null, description: "Water supply charges", department: "Engineering" },
      { id: "acct-5220", code: "5220", name: "Utilities - Gas", type: "expense", subtype: null, description: "LPG and natural gas expenses", department: "F&B" },
      { id: "acct-5230", code: "5230", name: "Internet & Telephone", type: "expense", subtype: null, description: "Internet service provider and telecom costs", department: "IT" },
      { id: "acct-5300", code: "5300", name: "Maintenance & Repairs", type: "expense", subtype: null, description: "Building, equipment, and facility maintenance", department: "Engineering" },
      { id: "acct-5310", code: "5310", name: "Supplies - Housekeeping", type: "expense", subtype: null, description: "Cleaning supplies, linens, amenities", department: "Housekeeping" },
      { id: "acct-5320", code: "5320", name: "Supplies - Office", type: "expense", subtype: null, description: "Office stationery and supplies", department: "Administration" },
      { id: "acct-5330", code: "5330", name: "Supplies - F&B", type: "expense", subtype: null, description: "Restaurant and kitchen consumables", department: "F&B" },
      { id: "acct-5400", code: "5400", name: "Marketing & Advertising", type: "expense", subtype: null, description: "Digital marketing, OTAs, print ads", department: "Marketing" },
      { id: "acct-5410", code: "5410", name: "Travel & Entertainment", type: "expense", subtype: null, description: "Business travel and client entertainment", department: "Administration" },
      { id: "acct-5420", code: "5420", name: "Professional Fees", type: "expense", subtype: null, description: "Legal, audit, and consulting fees", department: "Finance" },
      { id: "acct-5500", code: "5500", name: "Insurance", type: "expense", subtype: null, description: "Property, liability, and employee insurance", department: "Finance" },
      { id: "acct-5510", code: "5510", name: "Depreciation", type: "expense", subtype: null, description: "Depreciation on fixed assets", department: "Finance" },
      { id: "acct-5520", code: "5520", name: "Interest Expense", type: "expense", subtype: null, description: "Interest on bank loans and borrowings", department: "Finance" },
      { id: "acct-5530", code: "5530", name: "Bank Charges", type: "expense", subtype: null, description: "Bank service fees and transaction charges", department: "Finance" },
      { id: "acct-5540", code: "5540", name: "Laundry Expense", type: "expense", subtype: null, description: "Cost of guest laundry operations", department: "Housekeeping" },
      { id: "acct-5550", code: "5550", name: "F&B Supplies", type: "expense", subtype: null, description: "Crockery, glassware, kitchen tools", department: "F&B" },
      { id: "acct-5600", code: "5600", name: "Rent Expense", type: "expense", subtype: null, description: "Lease and rental payments", department: "Administration" },
      { id: "acct-5610", code: "5610", name: "Property Tax", type: "expense", subtype: null, description: "Property and municipal taxes", department: "Finance" },
    ].map((a) =>
      db.ledgerAccount.upsert({
        where: { id: a.id },
        update: {},
        create: a,
      })
    )
  );

  console.log(`   ✅ Created ${accounts.length} ledger accounts`);

  // ═══════════════════════════════════════════════════════════════
  // 2. ACCOUNTING PERIODS (Jan-Jul 2025)
  // ═══════════════════════════════════════════════════════════════
  console.log("\n📅 Creating Accounting Periods...");

  const periods = [
    { period: "2025-01", periodType: "month", start: "2025-01-01", end: "2025-01-31", status: "closed" },
    { period: "2025-02", periodType: "month", start: "2025-02-01", end: "2025-02-28", status: "closed" },
    { period: "2025-03", periodType: "month", start: "2025-03-01", end: "2025-03-31", status: "closed" },
    { period: "2025-04", periodType: "month", start: "2025-04-01", end: "2025-04-30", status: "closed" },
    { period: "2025-05", periodType: "month", start: "2025-05-01", end: "2025-05-31", status: "closed" },
    { period: "2025-06", periodType: "month", start: "2025-06-01", end: "2025-06-30", status: "closed" },
    { period: "2025-07", periodType: "month", start: "2025-07-01", end: "2025-07-31", status: "open" },
  ];

  const createdPeriods = await Promise.all(
    periods.map((p) =>
      db.accountingPeriod.upsert({
        where: { period: p.period },
        update: {},
        create: {
          period: p.period,
          periodType: p.periodType,
          startDate: new Date(p.start),
          endDate: new Date(p.end),
          status: p.status,
          closedBy: p.status === "closed" ? "admin" : null,
          closedAt: p.status === "closed" ? new Date(p.end + "T18:00:00") : null,
          openingTrialBalance: null,
          notes: p.status === "open" ? "Current open period for July 2025" : `Closed period - ${p.period}`,
        },
      })
    )
  );

  console.log(`   ✅ Created ${createdPeriods.length} accounting periods`);
  console.log(`   📌 Current period: 2025-07 (open)`);
  console.log(`   🔒 Closed periods: 2025-01 through 2025-06`);

  // ═══════════════════════════════════════════════════════════════
  // 3. BUDGETS (12 budgets for FY 2025)
  // ═══════════════════════════════════════════════════════════════
  console.log("\n💰 Creating Budgets...");

  const budgets = [
    { name: "Room Revenue Budget", fiscalYear: "2025", period: "2025-07", accountId: "acct-4000", accountName: "Room Revenue", accountCode: "4000", department: "Front Office", budgeted: 3500000, actual: 2875000, status: "Active" },
    { name: "F&B Revenue Budget", fiscalYear: "2025", period: "2025-07", accountId: "acct-4010", accountName: "F&B Revenue", accountCode: "4010", department: "F&B", budgeted: 1800000, actual: 1560000, status: "Active" },
    { name: "Spa Revenue Budget", fiscalYear: "2025", period: "2025-07", accountId: "acct-4030", accountName: "Spa Revenue", accountCode: "4030", department: "Spa", budgeted: 450000, actual: 385000, status: "Active" },
    { name: "Payroll Budget", fiscalYear: "2025", period: "2025-07", accountId: "acct-5100", accountName: "Salaries & Wages", accountCode: "5100", department: "HR", budgeted: 2200000, actual: 2150000, status: "Active" },
    { name: "Electricity Budget", fiscalYear: "2025", period: "2025-07", accountId: "acct-5200", accountName: "Utilities - Electricity", accountCode: "5200", department: "Engineering", budgeted: 350000, actual: 312000, status: "Active" },
    { name: "Marketing Budget", fiscalYear: "2025", period: "2025-07", accountId: "acct-5400", accountName: "Marketing & Advertising", accountCode: "5400", department: "Marketing", budgeted: 500000, actual: 478000, status: "Active" },
    { name: "F&B COGS Budget", fiscalYear: "2025", period: "2025-07", accountId: "acct-5000", accountName: "Cost of Goods Sold - F&B", accountCode: "5000", department: "F&B", budgeted: 720000, actual: 685000, status: "Active" },
    { name: "Maintenance Budget", fiscalYear: "2025", period: "2025-07", accountId: "acct-5300", accountName: "Maintenance & Repairs", accountCode: "5300", department: "Engineering", budgeted: 250000, actual: 198000, status: "Active" },
    { name: "Housekeeping Supplies Budget", fiscalYear: "2025", period: "2025-07", accountId: "acct-5310", accountName: "Supplies - Housekeeping", accountCode: "5310", department: "Housekeeping", budgeted: 180000, actual: 165000, status: "Active" },
    { name: "Event Revenue Budget", fiscalYear: "2025", period: "2025-07", accountId: "acct-4020", accountName: "Event/Banquet Revenue", accountCode: "4020", department: "Events", budgeted: 800000, actual: 720000, status: "Active" },
    { name: "Insurance Budget Q1", fiscalYear: "2025", period: "2025-01", accountId: "acct-5500", accountName: "Insurance", accountCode: "5500", department: "Finance", budgeted: 150000, actual: 148500, status: "Closed" },
    { name: "Professional Fees Budget", fiscalYear: "2025", period: "2025-07", accountId: "acct-5420", accountName: "Professional Fees", accountCode: "5420", department: "Finance", budgeted: 200000, actual: 125000, status: "Active" },
  ];

  const createdBudgets = await Promise.all(
    budgets.map((b, i) =>
      db.budget.upsert({
        where: { id: `budget-${i + 1}` },
        update: {},
        create: {
          id: `budget-${i + 1}`,
          name: b.name,
          fiscalYear: b.fiscalYear,
          period: b.period,
          accountId: b.accountId,
          accountName: b.accountName,
          accountCode: b.accountCode,
          department: b.department,
          budgetedAmount: b.budgeted,
          actualAmount: b.actual,
          status: b.status,
          notes: `FY ${b.fiscalYear} ${b.department} budget`,
        },
      })
    )
  );

  console.log(`   ✅ Created ${createdBudgets.length} budgets`);

  // ═══════════════════════════════════════════════════════════════
  // 4. INVOICES (10 invoices with line items)
  // ═══════════════════════════════════════════════════════════════
  console.log("\n🧾 Creating Invoices...");

  type InvoiceData = {
    id: string;
    invoiceNumber: string;
    type: string;
    vendorName?: string;
    customerName?: string;
    date: string;
    dueDate: string;
    status: string;
    notes?: string;
    createdBy: string;
    lineItems: { description: string; quantity: number; unitPrice: number; taxRate: number }[];
  };

  const invoicesData: InvoiceData[] = [
    {
      id: "inv-001",
      invoiceNumber: "SI-2025-0001",
      type: "sales",
      customerName: "Himalayan Treks Pvt. Ltd.",
      date: "2025-07-01",
      dueDate: "2025-07-31",
      status: "Paid",
      createdBy: "admin",
      notes: "Corporate rate for 10 rooms - July block booking",
      lineItems: [
        { description: "Deluxe Room - 10 nights x 10 rooms", quantity: 100, unitPrice: 5500, taxRate: 13 },
        { description: "Breakfast Buffet - 100 pax", quantity: 100, unitPrice: 800, taxRate: 13 },
      ],
    },
    {
      id: "inv-002",
      invoiceNumber: "SI-2025-0002",
      type: "sales",
      customerName: "Nepal Conference Organizers",
      date: "2025-07-05",
      dueDate: "2025-08-05",
      status: "Sent",
      createdBy: "admin",
      notes: "Banquet hall rental for tech conference",
      lineItems: [
        { description: "Grand Ballroom Rental - 3 days", quantity: 3, unitPrice: 85000, taxRate: 13 },
        { description: "AV Equipment Setup", quantity: 3, unitPrice: 15000, taxRate: 13 },
        { description: "Tea/Coffee Service - 200 pax x 3 days", quantity: 600, unitPrice: 350, taxRate: 13 },
      ],
    },
    {
      id: "inv-003",
      invoiceNumber: "PI-2025-0001",
      type: "purchase",
      vendorName: "Kathmandu Fresh Produce",
      date: "2025-07-03",
      dueDate: "2025-07-18",
      status: "Paid",
      createdBy: "admin",
      notes: "Weekly fresh produce delivery",
      lineItems: [
        { description: "Seasonal Vegetables - 50kg", quantity: 50, unitPrice: 120, taxRate: 13 },
        { description: "Fresh Fruits - 30kg", quantity: 30, unitPrice: 200, taxRate: 13 },
      ],
    },
    {
      id: "inv-004",
      invoiceNumber: "SI-2025-0003",
      type: "sales",
      customerName: "Thamel Travel Agency",
      date: "2025-06-15",
      dueDate: "2025-07-15",
      status: "Overdue",
      createdBy: "admin",
      notes: "Group booking - June packages, payment overdue",
      lineItems: [
        { description: "Standard Room - 20 nights x 5 rooms", quantity: 100, unitPrice: 3500, taxRate: 13 },
        { description: "Airport Transfers - 10 trips", quantity: 10, unitPrice: 1500, taxRate: 13 },
      ],
    },
    {
      id: "inv-005",
      invoiceNumber: "PI-2025-0002",
      type: "purchase",
      vendorName: "Nepal Linen Supply Co.",
      date: "2025-07-10",
      dueDate: "2025-08-10",
      status: "Partially Paid",
      createdBy: "admin",
      notes: "Bulk linen order - replacement stock",
      lineItems: [
        { description: "Bed Sheets (King) - 200 units", quantity: 200, unitPrice: 850, taxRate: 13 },
        { description: "Bath Towels - 300 units", quantity: 300, unitPrice: 450, taxRate: 13 },
        { description: "Pillow Covers - 400 units", quantity: 400, unitPrice: 180, taxRate: 13 },
      ],
    },
    {
      id: "inv-006",
      invoiceNumber: "SI-2025-0004",
      type: "sales",
      customerName: "Diplomatic Mission - Embassy of India",
      date: "2025-07-08",
      dueDate: "2025-08-08",
      status: "Draft",
      createdBy: "admin",
      notes: "Monthly accommodation for visiting delegates",
      lineItems: [
        { description: "Suite Room - 15 nights x 3 rooms", quantity: 45, unitPrice: 12000, taxRate: 13 },
        { description: "Laundry Service Package", quantity: 45, unitPrice: 500, taxRate: 13 },
      ],
    },
    {
      id: "inv-007",
      invoiceNumber: "PI-2025-0003",
      type: "purchase",
      vendorName: "Everest Beverages Ltd.",
      date: "2025-07-12",
      dueDate: "2025-07-27",
      status: "Sent",
      createdBy: "admin",
      notes: "Beverage restocking order",
      lineItems: [
        { description: "Tuborg Beer - 50 cases", quantity: 50, unitPrice: 1800, taxRate: 13 },
        { description: "Mineral Water (1L) - 200 cases", quantity: 200, unitPrice: 350, taxRate: 13 },
      ],
    },
    {
      id: "inv-008",
      invoiceNumber: "SI-2025-0005",
      type: "sales",
      customerName: "Shangri-La Events",
      date: "2025-07-02",
      dueDate: "2025-07-17",
      status: "Paid",
      createdBy: "admin",
      notes: "Wedding reception package",
      lineItems: [
        { description: "Garden Venue Rental", quantity: 1, unitPrice: 150000, taxRate: 13 },
        { description: "Dinner Buffet - 150 pax", quantity: 150, unitPrice: 2500, taxRate: 13 },
        { description: "Decorations & Floral Setup", quantity: 1, unitPrice: 75000, taxRate: 13 },
      ],
    },
    {
      id: "inv-009",
      invoiceNumber: "PI-2025-0004",
      type: "purchase",
      vendorName: "Tech Solutions Nepal",
      date: "2025-07-14",
      dueDate: "2025-08-14",
      status: "Draft",
      createdBy: "admin",
      notes: "PMS software license renewal",
      lineItems: [
        { description: "Hotel Management Software - Annual License", quantity: 1, unitPrice: 180000, taxRate: 13 },
        { description: "POS System Modules - 5 terminals", quantity: 5, unitPrice: 25000, taxRate: 13 },
      ],
    },
    {
      id: "inv-010",
      invoiceNumber: "SI-2025-0006",
      type: "sales",
      customerName: "Mountain View Photography",
      date: "2025-07-11",
      dueDate: "2025-08-11",
      status: "Sent",
      createdBy: "admin",
      notes: "Day-use meeting room and catering",
      lineItems: [
        { description: "Meeting Room Rental - Full Day", quantity: 5, unitPrice: 12000, taxRate: 13 },
        { description: "Working Lunch - 25 pax x 5 days", quantity: 125, unitPrice: 1200, taxRate: 13 },
      ],
    },
  ];

  for (const inv of invoicesData) {
    let subtotal = 0;
    let totalTax = 0;
    let grandTotal = 0;
    const lineItemsData = inv.lineItems.map((item) => {
      const lineTotal = item.quantity * item.unitPrice;
      const lineTax = lineTotal * (item.taxRate / 100);
      subtotal += lineTotal;
      totalTax += lineTax;
      grandTotal += lineTotal + lineTax;
      return {
        id: `${inv.id}-line-${inv.lineItems.indexOf(item) + 1}`,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
        totalAmount: lineTotal + lineTax,
      };
    });

    let paidAmount = 0;
    if (inv.status === "Paid") paidAmount = grandTotal;
    else if (inv.status === "Partially Paid") paidAmount = Math.round(grandTotal * 0.5);

    await db.invoice.upsert({
      where: { id: inv.id },
      update: {},
      create: {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        type: inv.type,
        vendorName: inv.vendorName,
        customerName: inv.customerName,
        date: new Date(inv.date),
        dueDate: new Date(inv.dueDate),
        status: inv.status,
        subtotal,
        taxAmount: totalTax,
        totalAmount: grandTotal,
        paidAmount,
        notes: inv.notes,
        createdBy: inv.createdBy,
        lineItems: { create: lineItemsData },
      },
    });
  }

  console.log(`   ✅ Created ${invoicesData.length} invoices with ${invoicesData.reduce((s, i) => s + i.lineItems.length, 0)} line items`);

  // ═══════════════════════════════════════════════════════════════
  // 5. JOURNAL ENTRIES (18 posted entries)
  // ═══════════════════════════════════════════════════════════════
  console.log("\n📒 Creating Journal Entries...");

  type JELine = { accountId: string; debit: number; credit: number; narration?: string };
  type JEData = {
    id: string;
    date: string;
    description: string;
    reference: string;
    lines: JELine[];
  };

  const journalEntries: JEData[] = [
    // JE-001: Daily room revenue - July 1
    {
      id: "je-001",
      date: "2025-07-01",
      description: "Daily room revenue - July 1 (45 rooms occupied)",
      reference: "DR-2025-0701",
      lines: [
        { accountId: "acct-1210", debit: 357500, credit: 0, narration: "Guest folio charges for 45 rooms" },
        { accountId: "acct-4000", debit: 0, credit: 316370, narration: "Room revenue at average NPR 7,030/night" },
        { accountId: "acct-2020", debit: 0, credit: 41130, narration: "VAT at 13%" },
      ],
    },
    // JE-002: POS restaurant revenue - July 1
    {
      id: "je-002",
      date: "2025-07-01",
      description: "Restaurant POS revenue - July 1 lunch & dinner",
      reference: "POS-2025-0701",
      lines: [
        { accountId: "acct-1000", debit: 48250, credit: 0, narration: "Cash sales at restaurant" },
        { accountId: "acct-1100", debit: 89400, credit: 0, narration: "Card payments to Nabil Bank" },
        { accountId: "acct-4010", debit: 0, credit: 121858, narration: "F&B revenue before VAT" },
        { accountId: "acct-2020", debit: 0, credit: 15792, narration: "VAT on restaurant sales" },
      ],
    },
    // JE-003: Payroll - July salary
    {
      id: "je-003",
      date: "2025-07-05",
      description: "Monthly payroll - July 2025",
      reference: "PAY-2025-07",
      lines: [
        { accountId: "acct-5100", debit: 2150000, credit: 0, narration: "Gross salaries for 85 staff" },
        { accountId: "acct-5110", debit: 322500, credit: 0, narration: "Provident fund and benefits" },
        { accountId: "acct-1100", debit: 0, credit: 1875000, narration: "Net salary paid via Nabil Bank" },
        { accountId: "acct-2030", debit: 0, credit: 215000, narration: "TDS on salary" },
        { accountId: "acct-2020", debit: 0, credit: 382500, narration: "Employer VAT contribution" },
      ],
    },
    // JE-004: Invoice payment received - Himalayan Treks
    {
      id: "je-004",
      date: "2025-07-03",
      description: "Payment received from Himalayan Treks Pvt. Ltd.",
      reference: "RCT-2025-0078",
      lines: [
        { accountId: "acct-1100", debit: 678000, credit: 0, narration: "Bank transfer received" },
        { accountId: "acct-1200", debit: 0, credit: 600000, narration: "Against invoice SI-2025-0001" },
        { accountId: "acct-2020", debit: 0, credit: 78000, narration: "VAT portion" },
      ],
    },
    // JE-005: Purchase order - Fresh produce
    {
      id: "je-005",
      date: "2025-07-03",
      description: "Purchase of fresh produce from Kathmandu Fresh Produce",
      reference: "PO-2025-0045",
      lines: [
        { accountId: "acct-5000", debit: 9200, credit: 0, narration: "COGS - vegetables 50kg x NPR 120" },
        { accountId: "acct-5000", debit: 6000, credit: 0, narration: "COGS - fruits 30kg x NPR 200" },
        { accountId: "acct-2020", debit: 0, credit: 1976, narration: "Input VAT 13%" },
        { accountId: "acct-2000", debit: 0, credit: 13224, narration: "Accounts Payable - Kathmandu Fresh" },
      ],
    },
    // JE-006: Mini bar revenue
    {
      id: "je-006",
      date: "2025-07-02",
      description: "Mini bar revenue collection - July 2",
      reference: "MINI-2025-0702",
      lines: [
        { accountId: "acct-1210", debit: 28500, credit: 0, narration: "Charged to guest folios" },
        { accountId: "acct-4080", debit: 0, credit: 25221, narration: "Mini bar revenue" },
        { accountId: "acct-2020", debit: 0, credit: 3279, narration: "VAT 13%" },
      ],
    },
    // JE-007: Room service revenue
    {
      id: "je-007",
      date: "2025-07-02",
      description: "Room service revenue - July 2",
      reference: "RS-2025-0702",
      lines: [
        { accountId: "acct-1210", debit: 42500, credit: 0, narration: "Room service charged to guests" },
        { accountId: "acct-4090", debit: 0, credit: 37611, narration: "Room service revenue" },
        { accountId: "acct-2020", debit: 0, credit: 4889, narration: "VAT 13%" },
      ],
    },
    // JE-008: Electricity bill payment
    {
      id: "je-008",
      date: "2025-07-07",
      description: "Nepal Electricity Authority - July bill",
      reference: "UTL-2025-ELEC",
      lines: [
        { accountId: "acct-5200", debit: 312000, credit: 0, narration: "Electricity charge for June consumption" },
        { accountId: "acct-1100", debit: 0, credit: 312000, narration: "Paid via Nabil Bank" },
      ],
    },
    // JE-009: Spa revenue
    {
      id: "je-009",
      date: "2025-07-05",
      description: "Spa treatment revenue - July 1-5 weekly",
      reference: "SPA-2025-W27",
      lines: [
        { accountId: "acct-1000", debit: 45000, credit: 0, narration: "Cash payments" },
        { accountId: "acct-1210", debit: 135000, credit: 0, narration: "Charged to guest rooms" },
        { accountId: "acct-4030", debit: 0, credit: 159292, narration: "Spa revenue" },
        { accountId: "acct-2020", debit: 0, credit: 20708, narration: "VAT 13%" },
      ],
    },
    // JE-010: Petty cash replenishment
    {
      id: "je-010",
      date: "2025-07-08",
      description: "Petty cash replenishment for front office",
      reference: "PC-2025-07",
      lines: [
        { accountId: "acct-1010", debit: 50000, credit: 0, narration: "Petty cash fund top-up" },
        { accountId: "acct-1100", debit: 0, credit: 50000, narration: "Cash withdrawal from Nabil Bank" },
      ],
    },
    // JE-011: Maintenance expense
    {
      id: "je-011",
      date: "2025-07-06",
      description: "AC unit repair and servicing - 3rd floor",
      reference: "MNT-2025-0089",
      lines: [
        { accountId: "acct-5300", debit: 45000, credit: 0, narration: "AC repair and servicing" },
        { accountId: "acct-2000", debit: 0, credit: 45000, narration: "Payable to CoolAir Services" },
      ],
    },
    // JE-012: Event/Banquet revenue
    {
      id: "je-012",
      date: "2025-07-06",
      description: "Wedding reception revenue - July 5",
      reference: "EVT-2025-0023",
      lines: [
        { accountId: "acct-1000", debit: 150000, credit: 0, narration: "Cash advance received" },
        { accountId: "acct-1100", debit: 488250, credit: 0, narration: "Balance paid via bank transfer" },
        { accountId: "acct-4020", debit: 0, credit: 562500, narration: "Banquet hall and service revenue" },
        { accountId: "acct-2020", debit: 0, credit: 75750, narration: "VAT 13%" },
      ],
    },
    // JE-013: F&B inventory purchase
    {
      id: "je-013",
      date: "2025-07-08",
      description: "Beverage stock purchase from Everest Beverages",
      reference: "PO-2025-0048",
      lines: [
        { accountId: "acct-1300", debit: 90000, credit: 0, narration: "50 cases Tuborg Beer" },
        { accountId: "acct-1300", debit: 70000, credit: 0, narration: "200 cases Mineral Water" },
        { accountId: "acct-2020", debit: 0, credit: 20800, narration: "Input VAT 13%" },
        { accountId: "acct-2000", debit: 0, credit: 139200, narration: "Payable to Everest Beverages" },
      ],
    },
    // JE-014: Laundry expense
    {
      id: "je-014",
      date: "2025-07-09",
      description: "Guest laundry service - external provider",
      reference: "LND-2025-0709",
      lines: [
        { accountId: "acct-5540", debit: 18000, credit: 0, narration: "Laundry service cost" },
        { accountId: "acct-1100", debit: 0, credit: 18000, narration: "Paid to CleanPro Laundry" },
      ],
    },
    // JE-015: Marketing expense - OTA commission
    {
      id: "je-015",
      date: "2025-07-10",
      description: "OTA commission - Booking.com July bookings",
      reference: "MKT-2025-OTA",
      lines: [
        { accountId: "acct-5400", debit: 125000, credit: 0, narration: "Booking.com commission 15%" },
        { accountId: "acct-1100", debit: 0, credit: 125000, narration: "Commission deducted from payout" },
      ],
    },
    // JE-016: Depreciation entry
    {
      id: "je-016",
      date: "2025-07-01",
      description: "Monthly depreciation - July 2025",
      reference: "DEP-2025-07",
      lines: [
        { accountId: "acct-5510", debit: 85000, credit: 0, narration: "Monthly depreciation" },
        { accountId: "acct-1530", debit: 0, credit: 85000, narration: "Accumulated depreciation" },
      ],
    },
    // JE-017: Bank loan interest
    {
      id: "je-017",
      date: "2025-07-01",
      description: "Monthly loan interest - Nabil Bank",
      reference: "INT-2025-07",
      lines: [
        { accountId: "acct-5520", debit: 67500, credit: 0, narration: "Interest on property loan" },
        { accountId: "acct-1100", debit: 0, credit: 67500, narration: "Auto-debit from Nabil Bank" },
      ],
    },
    // JE-018: Bank charges
    {
      id: "je-018",
      date: "2025-07-10",
      description: "Monthly bank charges - Nabil & NIC Asia",
      reference: "BNK-2025-07",
      lines: [
        { accountId: "acct-5530", debit: 2500, credit: 0, narration: "Nabil Bank service charges" },
        { accountId: "acct-5530", debit: 1500, credit: 0, narration: "NIC Asia Bank service charges" },
        { accountId: "acct-1100", debit: 0, credit: 2500, narration: "Nabil Bank debit" },
        { accountId: "acct-1101", debit: 0, credit: 1500, narration: "NIC Asia Bank debit" },
      ],
    },
  ];

  // Validate all entries balance before inserting
  for (const je of journalEntries) {
    const totalDebit = je.lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = je.lines.reduce((s, l) => s + l.credit, 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(`Journal entry ${je.id} is not balanced! DR=${totalDebit} CR=${totalCredit}`);
    }
  }
  console.log("   ✅ All journal entries validated (balanced)");

  for (const je of journalEntries) {
    await db.journalEntry.upsert({
      where: { id: je.id },
      update: {},
      create: {
        id: je.id,
        date: new Date(je.date),
        description: je.description,
        reference: je.reference,
        status: "posted",
        sourceModule: "manual",
        createdBy: "admin",
        postedBy: "admin",
        postedAt: new Date(je.date + "T18:00:00"),
        lines: {
          create: je.lines.map((line, idx) => ({
            id: `${je.id}-L${idx + 1}`,
            accountId: line.accountId,
            debit: line.debit,
            credit: line.credit,
            narration: line.narration,
          })),
        },
      },
    });
  }

  console.log(`   ✅ Created ${journalEntries.length} posted journal entries with ${journalEntries.reduce((s, j) => s + j.lines.length, 0)} line items`);

  // ═══════════════════════════════════════════════════════════════
  // 6. RECONCILIATIONS (2 bank reconciliations)
  // ═══════════════════════════════════════════════════════════════
  console.log("\n🔍 Creating Bank Reconciliations...");

  const reconciliations = [
    {
      id: "recon-001",
      accountId: "acct-1100",
      accountName: "Bank Account - Nabil",
      accountCode: "1100",
      bankName: "Nabil Bank",
      statementDate: "2025-06-30",
      statementBalance: 4256000,
      bookBalance: 4256000,
      difference: 0,
      status: "reconciled",
      reconciledBy: "admin",
      reconciledAt: "2025-07-03T10:30:00",
      adjustments: JSON.stringify([
        { date: "2025-06-28", description: "Bank service charge", amount: -2500 },
        { date: "2025-06-30", description: "Interest credit", amount: 1200 },
      ]),
      notes: "June 2025 bank reconciliation - all items matched",
    },
    {
      id: "recon-002",
      accountId: "acct-1101",
      accountName: "Bank Account - NIC Asia",
      accountCode: "1101",
      bankName: "NIC Asia Bank",
      statementDate: "2025-07-15",
      statementBalance: 892000,
      bookBalance: 905000,
      difference: -13000,
      status: "pending",
      reconciledBy: null,
      reconciledAt: null,
      adjustments: JSON.stringify([
        { date: "2025-07-14", description: "Outstanding cheque #1045 - Housekeeping supplies", amount: -8500 },
        { date: "2025-07-15", description: "Deposit in transit - Event payment", amount: 26500 },
      ]),
      notes: "July mid-month reconciliation pending - 2 outstanding items",
    },
  ];

  for (const recon of reconciliations) {
    await db.reconciliation.upsert({
      where: { id: recon.id },
      update: {},
      create: {
        id: recon.id,
        accountId: recon.accountId,
        accountName: recon.accountName,
        accountCode: recon.accountCode,
        bankName: recon.bankName,
        statementDate: new Date(recon.statementDate),
        statementBalance: recon.statementBalance,
        bookBalance: recon.bookBalance,
        difference: recon.difference,
        status: recon.status,
        reconciledBy: recon.reconciledBy,
        reconciledAt: recon.reconciledAt ? new Date(recon.reconciledAt) : null,
        adjustments: recon.adjustments,
        notes: recon.notes,
      },
    });
  }

  console.log(`   ✅ Created ${reconciliations.length} bank reconciliations`);

  // ═══════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════
  console.log("\n" + "=".repeat(60));
  console.log("  🌱 SEEDING COMPLETE - HOSPITALITY ACCOUNTING DATA");
  console.log("=".repeat(60));
  console.log(`  Chart of Accounts:     ${accounts.length} accounts`);
  console.log(`  Accounting Periods:    ${createdPeriods.length} periods (6 closed, 1 open)`);
  console.log(`  Budgets:               ${createdBudgets.length} budgets`);
  console.log(`  Invoices:              ${invoicesData.length} invoices`);
  console.log(`  Journal Entries:       ${journalEntries.length} entries`);
  console.log(`  Reconciliations:       ${reconciliations.length} reconciliations`);
  console.log("=".repeat(60));
  console.log("  ✨ All data seeded successfully!\n");
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed error:", e);
    await db.$disconnect();
    process.exit(1);
  });
