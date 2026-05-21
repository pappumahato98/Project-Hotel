import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, ShoppingBag, CheckCircle2, UploadCloud, FileScan, Sparkles } from "lucide-react";
import { useState } from "react";
import { useExpenses } from "@/hooks/useFinanceExtended";

interface APTransactionServiceProps {
  isReadOnly?: boolean;
}

export function APTransactionService({ isReadOnly }: APTransactionServiceProps) {
  const { data: expenses, isLoading } = useExpenses();
  const [isUploading, setIsUploading] = useState(false);
  const [ocrResult, setOcrResult] = useState<any>(null);

  const handleSimulateOCR = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      setOcrResult({
        vendor: "Sysco Foods Inc.",
        invoice_num: "INV-88392",
        date: "2024-05-14",
        amount: 1450.75,
        tax: 110.50,
        category: "food"
      });
      toast.success("Invoice scanned and data extracted successfully via AI.");
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display">Accounts Payable</h2>
          <p className="text-muted-foreground text-sm">Manage vendor invoices, payments, and settlements.</p>
        </div>
        {!isReadOnly && (
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> New Expense
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Expense & Vendor Postings</CardTitle>
              <CardDescription>Recent vendor invoices and operational expenses</CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 gap-1">
                <ShoppingBag className="h-3 w-3" /> PO Matching
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading expenses...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Expense #</TableHead>
                  <TableHead>Vendor/Payee</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No expenses found</TableCell>
                  </TableRow>
                ) : (
                  expenses?.map((exp) => (
                    <TableRow key={exp.id}>
                      <TableCell className="font-mono">{exp.expense_number}</TableCell>
                      <TableCell>{exp.vendor || "Operational"}</TableCell>
                      <TableCell className="capitalize">{exp.category}</TableCell>
                      <TableCell>{exp.expense_date}</TableCell>
                      <TableCell className="text-right font-mono">${exp.amount.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          exp.status === "paid" ? "bg-success/20 text-success" :
                          exp.status === "approved" ? "bg-blue-500/20 text-blue-400" : "bg-amber-500/20 text-amber-400"
                        }>
                          {exp.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> AI-Assisted Invoice OCR
            </CardTitle>
            <CardDescription>Upload an invoice photo or PDF to automatically extract data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!ocrResult ? (
              <div 
                className="border-2 border-dashed border-primary/30 rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-primary/10 transition-colors"
                onClick={handleSimulateOCR}
              >
                {isUploading ? (
                  <>
                    <FileScan className="h-10 w-10 text-primary mb-4 animate-pulse" />
                    <p className="text-sm font-medium">Scanning and Extracting Data...</p>
                    <p className="text-xs text-muted-foreground mt-1">Using Google Document AI</p>
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-10 w-10 text-muted-foreground mb-4" />
                    <p className="text-sm font-medium">Click to upload or drag and drop</p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG, or PDF (Max 10MB)</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4 p-4 rounded-lg bg-background border border-border">
                <div className="flex justify-between items-center pb-2 border-b">
                  <Badge className="bg-success/20 text-success border-success/30 gap-1">
                    <CheckCircle2 className="h-3 w-3" /> High Confidence
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => setOcrResult(null)}>Clear</Button>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div><span className="text-muted-foreground block text-xs">Vendor Name</span><span className="font-medium">{ocrResult.vendor}</span></div>
                  <div><span className="text-muted-foreground block text-xs">Invoice No.</span><span className="font-mono">{ocrResult.invoice_num}</span></div>
                  <div><span className="text-muted-foreground block text-xs">Date</span><span>{ocrResult.date}</span></div>
                  <div><span className="text-muted-foreground block text-xs">Category</span><span className="capitalize">{ocrResult.category}</span></div>
                  <div><span className="text-muted-foreground block text-xs">Tax Amount</span><span className="font-mono text-muted-foreground">${ocrResult.tax.toFixed(2)}</span></div>
                  <div><span className="text-muted-foreground block text-xs">Total Amount</span><span className="font-mono font-bold text-primary">${ocrResult.amount.toFixed(2)}</span></div>
                </div>
                <Button className="w-full gap-2 mt-2">
                  <Plus className="h-4 w-4" /> Post Extracted Expense
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-success/5 border-success/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" /> Automated Matching
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              98% of vendor invoices matched with PO/GRN automatically this period.
              No discrepancies detected requiring manual intervention.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
