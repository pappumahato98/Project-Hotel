import { useState, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Download,
  Printer,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Scale,
} from "lucide-react";
import { useTrialBalance, Account } from "@/hooks/useFinance";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { format } from "date-fns";

interface FinancialStatementsProps {
  companyName?: string;
  isReadOnly?: boolean;
}

export function FinancialStatements({
  companyName = "LuxeStay Hotel",
  isReadOnly
}: FinancialStatementsProps) {
  const [asOfDate, setAsOfDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [activeTab, setActiveTab] = useState("pnl");
  const printRef = useRef<HTMLDivElement>(null);

  const { data: trialBalance, isLoading } = useTrialBalance(asOfDate);

  // Calculate P&L data
  const pnlData = useMemo(() => {
    const revenue: { account: Account; amount: number }[] = [];
    const expenses: { account: Account; amount: number }[] = [];

    trialBalance.forEach((item) => {
      const netAmount = item.totalCredit - item.totalDebit;
      if (item.account.type === "revenue") {
        revenue.push({ account: item.account, amount: netAmount });
      } else if (item.account.type === "expense") {
        // Expenses are debit-normal, so positive debit = expense
        expenses.push({ account: item.account, amount: item.totalDebit - item.totalCredit });
      }
    });

    const totalRevenue = revenue.reduce((sum, r) => sum + r.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netIncome = totalRevenue - totalExpenses;

    return { revenue, expenses, totalRevenue, totalExpenses, netIncome };
  }, [trialBalance]);

  // Calculate Balance Sheet data
  const balanceSheetData = useMemo(() => {
    const assets: { account: Account; amount: number }[] = [];
    const liabilities: { account: Account; amount: number }[] = [];
    const equity: { account: Account; amount: number }[] = [];

    trialBalance.forEach((item) => {
      if (item.account.type === "asset") {
        const netAmount = item.totalDebit - item.totalCredit;
        assets.push({ account: item.account, amount: netAmount });
      } else if (item.account.type === "liability") {
        const netAmount = item.totalCredit - item.totalDebit;
        liabilities.push({ account: item.account, amount: netAmount });
      } else if (item.account.type === "equity") {
        const netAmount = item.totalCredit - item.totalDebit;
        equity.push({ account: item.account, amount: netAmount });
      }
    });

    const totalAssets = assets.reduce((sum, a) => sum + a.amount, 0);
    const totalLiabilities = liabilities.reduce((sum, l) => sum + l.amount, 0);
    const totalEquity = equity.reduce((sum, e) => sum + e.amount, 0) + pnlData.netIncome;
    const balances = totalAssets === (totalLiabilities + totalEquity);

    return { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity, balances };
  }, [trialBalance, pnlData.netIncome]);

  const handlePrint = () => {
    window.print();
  };

  const exportPnLToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(companyName, 105, 20, { align: "center" });
    doc.setFontSize(14);
    doc.text("Profit & Loss Statement", 105, 30, { align: "center" });
    doc.setFontSize(10);
    doc.text(`As of ${asOfDate}`, 105, 38, { align: "center" });

    let y = 55;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("REVENUE", 14, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    pnlData.revenue.forEach((item) => {
      doc.text(`  ${item.account.code} - ${item.account.name}`, 14, y);
      doc.text(`$${item.amount.toFixed(2)}`, 180, y, { align: "right" });
      y += 6;
    });

    doc.setFont("helvetica", "bold");
    doc.text("Total Revenue", 14, y);
    doc.text(`$${pnlData.totalRevenue.toFixed(2)}`, 180, y, { align: "right" });
    y += 12;

    doc.text("EXPENSES", 14, y);
    y += 8;
    doc.setFont("helvetica", "normal");

    pnlData.expenses.forEach((item) => {
      doc.text(`  ${item.account.code} - ${item.account.name}`, 14, y);
      doc.text(`$${item.amount.toFixed(2)}`, 180, y, { align: "right" });
      y += 6;
    });

    doc.setFont("helvetica", "bold");
    doc.text("Total Expenses", 14, y);
    doc.text(`$${pnlData.totalExpenses.toFixed(2)}`, 180, y, { align: "right" });
    y += 12;

    doc.setFontSize(12);
    doc.text("NET INCOME", 14, y);
    doc.text(`$${pnlData.netIncome.toFixed(2)}`, 180, y, { align: "right" });

    doc.save(`pnl-statement-${asOfDate}.pdf`);
  };

  const exportBalanceSheetToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(companyName, 105, 20, { align: "center" });
    doc.setFontSize(14);
    doc.text("Balance Sheet", 105, 30, { align: "center" });
    doc.setFontSize(10);
    doc.text(`As of ${asOfDate}`, 105, 38, { align: "center" });

    let y = 55;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("ASSETS", 14, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    balanceSheetData.assets.forEach((item) => {
      doc.text(`  ${item.account.code} - ${item.account.name}`, 14, y);
      doc.text(`$${item.amount.toFixed(2)}`, 180, y, { align: "right" });
      y += 6;
    });

    doc.setFont("helvetica", "bold");
    doc.text("Total Assets", 14, y);
    doc.text(`$${balanceSheetData.totalAssets.toFixed(2)}`, 180, y, { align: "right" });
    y += 12;

    doc.text("LIABILITIES", 14, y);
    y += 8;
    doc.setFont("helvetica", "normal");

    balanceSheetData.liabilities.forEach((item) => {
      doc.text(`  ${item.account.code} - ${item.account.name}`, 14, y);
      doc.text(`$${item.amount.toFixed(2)}`, 180, y, { align: "right" });
      y += 6;
    });

    doc.setFont("helvetica", "bold");
    doc.text("Total Liabilities", 14, y);
    doc.text(`$${balanceSheetData.totalLiabilities.toFixed(2)}`, 180, y, { align: "right" });
    y += 12;

    doc.text("EQUITY", 14, y);
    y += 8;
    doc.setFont("helvetica", "normal");

    balanceSheetData.equity.forEach((item) => {
      doc.text(`  ${item.account.code} - ${item.account.name}`, 14, y);
      doc.text(`$${item.amount.toFixed(2)}`, 180, y, { align: "right" });
      y += 6;
    });

    doc.text("  Retained Earnings (Net Income)", 14, y);
    doc.text(`$${pnlData.netIncome.toFixed(2)}`, 180, y, { align: "right" });
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.text("Total Equity", 14, y);
    doc.text(`$${balanceSheetData.totalEquity.toFixed(2)}`, 180, y, { align: "right" });
    y += 12;

    doc.setFontSize(12);
    doc.text("TOTAL LIABILITIES & EQUITY", 14, y);
    doc.text(`$${(balanceSheetData.totalLiabilities + balanceSheetData.totalEquity).toFixed(2)}`, 180, y, { align: "right" });

    doc.save(`balance-sheet-${asOfDate}.pdf`);
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // P&L Sheet
    const pnlRows = [
      [companyName],
      ["Profit & Loss Statement"],
      [`As of ${asOfDate}`],
      [],
      ["REVENUE"],
      ["Account Code", "Account Name", "Amount"],
      ...pnlData.revenue.map((r) => [r.account.code, r.account.name, r.amount]),
      ["", "Total Revenue", pnlData.totalRevenue],
      [],
      ["EXPENSES"],
      ["Account Code", "Account Name", "Amount"],
      ...pnlData.expenses.map((e) => [e.account.code, e.account.name, e.amount]),
      ["", "Total Expenses", pnlData.totalExpenses],
      [],
      ["", "NET INCOME", pnlData.netIncome],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pnlRows), "Profit & Loss");

    // Balance Sheet
    const bsRows = [
      [companyName],
      ["Balance Sheet"],
      [`As of ${asOfDate}`],
      [],
      ["ASSETS"],
      ["Account Code", "Account Name", "Amount"],
      ...balanceSheetData.assets.map((a) => [a.account.code, a.account.name, a.amount]),
      ["", "Total Assets", balanceSheetData.totalAssets],
      [],
      ["LIABILITIES"],
      ["Account Code", "Account Name", "Amount"],
      ...balanceSheetData.liabilities.map((l) => [l.account.code, l.account.name, l.amount]),
      ["", "Total Liabilities", balanceSheetData.totalLiabilities],
      [],
      ["EQUITY"],
      ["Account Code", "Account Name", "Amount"],
      ...balanceSheetData.equity.map((e) => [e.account.code, e.account.name, e.amount]),
      ["Retained Earnings", "Net Income", pnlData.netIncome],
      ["", "Total Equity", balanceSheetData.totalEquity],
      [],
      ["", "TOTAL LIABILITIES & EQUITY", balanceSheetData.totalLiabilities + balanceSheetData.totalEquity],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(bsRows), "Balance Sheet");

    XLSX.writeFile(wb, `financial-statements-${asOfDate}.xlsx`);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading financial data...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>As of Date</Label>
              <Input
                type="date"
                value={asOfDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" onClick={exportToExcel}>
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statements */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pnl" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Profit & Loss
          </TabsTrigger>
          <TabsTrigger value="balance-sheet" className="gap-2">
            <Scale className="h-4 w-4" />
            Balance Sheet
          </TabsTrigger>
        </TabsList>

        {/* Profit & Loss */}
        <TabsContent value="pnl" className="mt-6">
          <Card ref={printRef} className="print:shadow-none">
            <CardHeader className="text-center border-b">
              <CardTitle className="text-2xl">{companyName}</CardTitle>
              <CardDescription className="text-lg font-medium">
                Profit & Loss Statement
              </CardDescription>
              <p className="text-sm text-muted-foreground">As of {asOfDate}</p>
            </CardHeader>
            <CardContent className="pt-6">
              {/* Revenue Section */}
              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-success" />
                  REVENUE
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pnlData.revenue.map((item) => (
                      <TableRow key={item.account.id}>
                        <TableCell>
                          <span className="font-mono text-muted-foreground mr-2">
                            {item.account.code}
                          </span>
                          {item.account.name}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${item.amount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-semibold bg-success/10">
                      <TableCell>Total Revenue</TableCell>
                      <TableCell className="text-right font-mono text-success">
                        ${pnlData.totalRevenue.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Expenses Section */}
              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                  EXPENSES
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pnlData.expenses.map((item) => (
                      <TableRow key={item.account.id}>
                        <TableCell>
                          <span className="font-mono text-muted-foreground mr-2">
                            {item.account.code}
                          </span>
                          {item.account.name}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${item.amount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-semibold bg-destructive/10">
                      <TableCell>Total Expenses</TableCell>
                      <TableCell className="text-right font-mono text-destructive">
                        ${pnlData.totalExpenses.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Net Income */}
              <div className="border-t-2 border-primary pt-4">
                <div className="flex justify-between items-center text-xl font-bold">
                  <span className="flex items-center gap-2">
                    <DollarSign className="h-6 w-6" />
                    NET INCOME
                  </span>
                  <span className={pnlData.netIncome >= 0 ? "text-success" : "text-destructive"}>
                    ${pnlData.netIncome.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Button onClick={exportPnLToPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Balance Sheet */}
        <TabsContent value="balance-sheet" className="mt-6">
          <Card className="print:shadow-none">
            <CardHeader className="text-center border-b">
              <CardTitle className="text-2xl">{companyName}</CardTitle>
              <CardDescription className="text-lg font-medium">Balance Sheet</CardDescription>
              <p className="text-sm text-muted-foreground">As of {asOfDate}</p>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Assets */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">ASSETS</h3>
                  <Table>
                    <TableBody>
                      {balanceSheetData.assets.map((item) => (
                        <TableRow key={item.account.id}>
                          <TableCell>
                            <span className="font-mono text-muted-foreground mr-2">
                              {item.account.code}
                            </span>
                            {item.account.name}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            ${item.amount.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-semibold bg-primary/10">
                        <TableCell>Total Assets</TableCell>
                        <TableCell className="text-right font-mono">
                          ${balanceSheetData.totalAssets.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {/* Liabilities & Equity */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">LIABILITIES</h3>
                  <Table>
                    <TableBody>
                      {balanceSheetData.liabilities.map((item) => (
                        <TableRow key={item.account.id}>
                          <TableCell>
                            <span className="font-mono text-muted-foreground mr-2">
                              {item.account.code}
                            </span>
                            {item.account.name}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            ${item.amount.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-semibold">
                        <TableCell>Total Liabilities</TableCell>
                        <TableCell className="text-right font-mono">
                          ${balanceSheetData.totalLiabilities.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>

                  <h3 className="font-semibold text-lg mb-3 mt-6">EQUITY</h3>
                  <Table>
                    <TableBody>
                      {balanceSheetData.equity.map((item) => (
                        <TableRow key={item.account.id}>
                          <TableCell>
                            <span className="font-mono text-muted-foreground mr-2">
                              {item.account.code}
                            </span>
                            {item.account.name}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            ${item.amount.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell className="text-muted-foreground">
                          Retained Earnings (Net Income)
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${pnlData.netIncome.toFixed(2)}
                        </TableCell>
                      </TableRow>
                      <TableRow className="font-semibold bg-primary/10">
                        <TableCell>Total Equity</TableCell>
                        <TableCell className="text-right font-mono">
                          ${balanceSheetData.totalEquity.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>

                  <div className="mt-4 pt-4 border-t-2 border-primary">
                    <div className="flex justify-between font-bold">
                      <span>Total Liabilities & Equity</span>
                      <span className="font-mono">
                        ${(balanceSheetData.totalLiabilities + balanceSheetData.totalEquity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Balance Check */}
              <div className="mt-6 p-4 rounded-lg bg-secondary/50 flex items-center justify-between">
                <span className="font-medium">Balance Check:</span>
                <span className={balanceSheetData.balances ? "text-success" : "text-destructive"}>
                  {balanceSheetData.balances ? "✓ Assets = Liabilities + Equity" : "✗ Out of Balance"}
                </span>
              </div>

              <div className="mt-4 flex justify-end">
                <Button onClick={exportBalanceSheetToPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
