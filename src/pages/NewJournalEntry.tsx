import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Pencil, Trash2, Save, FilePlus, Paperclip, Eye, X, Lock, ArrowLeft,
} from "lucide-react";
import {
  useJournalEntries, useCreateJournalEntry, usePostJournalEntry, useAccounts,
} from "@/hooks/useFinance";
import { toast } from "sonner";
import { NepaliDateInput } from "@/components/shared/NepaliDateInput";
import { formatISOasBS, todayBS, bsToAD, adToBS, formatBSDate } from "@/lib/nepaliDate";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLocalizationSettings } from "@/hooks/useSettings";

// ─── Types ───────────────────────────────────────────────────────────────────
type VoucherType = "journal" | "receipt" | "payment" | "contra";

const VOUCHER_PREFIXES: Record<VoucherType, string> = {
  journal: "JV", receipt: "RV", payment: "PV", contra: "CV",
};

const VOUCHER_LABELS: Record<VoucherType, string> = {
  journal: "Journal Voucher", receipt: "Receipt Voucher", payment: "Payment Voucher", contra: "Contra Voucher",
};

const PREFIX_TO_TYPE: Record<string, VoucherType> = {
  JV: "journal",
  RV: "receipt",
  PV: "payment",
  CV: "contra",
};

interface EntryLine {
  id: string;
  account_id: string;
  sub_account: string;
  debit: number;
  credit: number;
  remarks: string;
}

function generateId() {
  return crypto.randomUUID?.() || Math.random().toString(36).slice(2);
}

function emptyLine(): EntryLine {
  return { id: generateId(), account_id: "", sub_account: "", debit: 0, credit: 0, remarks: "" };
}

function getNepaliFiscalYears() {
  const current = todayBS();
  const years: string[] = [];
  for (let y = current.year - 2; y <= current.year + 1; y++) {
    years.push(`${y}/${(y + 1).toString().slice(-2)}`);
  }
  return years;
}

function getCurrentNepaliFiscalYear() {
  const bs = todayBS();
  if (bs.month >= 4) return `${bs.year}/${(bs.year + 1).toString().slice(-2)}`;
  return `${bs.year - 1}/${bs.year.toString().slice(-2)}`;
}

async function generateVoucherNo(voucherType: VoucherType, fiscalYear: string): Promise<string> {
  const prefix = VOUCHER_PREFIXES[voucherType];
  const fyShort = fiscalYear.replace("/", "-");
  const pattern = `${prefix}-${fyShort}-%`;

  // Query for existing entries with this prefix pattern to find next sequence
  const { data } = await supabase
    .from("journal_entries")
    .select("reference, entry_number")
    .or(`reference.like.${pattern},entry_number.like.${pattern}`)
    .order("created_at", { ascending: false });

  let maxSeq = 0;
  const regex = new RegExp(`${prefix}-${fyShort.replace(/[-/]/g, "[-/]?")}-(\\d+)$`);
  (data || []).forEach((row: any) => {
    const ref = row.reference || row.entry_number || "";
    const match = ref.match(regex);
    if (match) {
      const n = parseInt(match[1]);
      if (n > maxSeq) maxSeq = n;
    }
  });

  const nextSeq = String(maxSeq + 1).padStart(2, "0");
  return `${prefix}-${fyShort}-${nextSeq}`;
}

/** Get AD date range for a Nepali fiscal year string like "2082/83" */
function getFiscalYearADRange(fy: string): { minDate: string; maxDate: string } {
  const startYear = parseInt(fy.split("/")[0]);
  // Nepali FY starts on 1 Shrawan (month 4) and ends on 31 Ashar (month 3) next year
  const startBS = { year: startYear, month: 4, day: 1 };
  const endBS = { year: startYear + 1, month: 3, day: 32 }; // will clamp
  // Get actual last day of Ashar
  const endBSClamped = { year: startYear + 1, month: 3, day: 31 }; // safe upper bound

  const startAD = bsToAD(startBS);
  const endAD = bsToAD(endBSClamped);

  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { minDate: fmt(startAD), maxDate: fmt(endAD) };
}

// ─── Create Ledger Dialog Component ──────────────────────────────────────────
function CreateLedgerDialog({
  open,
  onOpenChange,
  type,
  accounts,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  type: "ledger" | "sub_ledger";
  accounts?: { id: string; code: string; name: string; type: string }[];
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [acctType, setAcctType] = useState("expense");
  const [parentId, setParentId] = useState("");

  const handleCreate = () => {
    if (!name.trim() || !code.trim()) {
      toast.error("Name and Code are required");
      return;
    }
    // TODO: wire to actual create account mutation
    toast.success(`${type === "ledger" ? "Ledger" : "Sub-Ledger"} "${name}" created (demo)`);
    setName(""); setCode(""); setAcctType("expense"); setParentId("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{type === "ledger" ? "Create Ledger Account" : "Create Sub-Ledger Account"}</DialogTitle>
          <DialogDescription>Add a new {type === "ledger" ? "ledger" : "sub-ledger"} account to the chart of accounts.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Account Code *</Label>
            <Input value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. 1100" className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Account Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Cash in Hand" className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Account Type</Label>
            <Select value={acctType} onValueChange={setAcctType}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["asset", "liability", "equity", "income", "expense"].map(t => (
                  <SelectItem key={t} value={t} className="text-xs capitalize">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {type === "sub_ledger" && accounts && (
            <div className="space-y-1.5">
              <Label className="text-xs">Parent Account</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select parent" /></SelectTrigger>
                <SelectContent>
                  {accounts.map(a => (
                    <SelectItem key={a.id} value={a.id} className="text-xs">{a.code} - {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleCreate}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function NewJournalEntry() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editEntryId = searchParams.get("edit");
  const isEditMode = !!editEntryId;

  // ── Header State ──
  const [fiscalYear, setFiscalYear] = useState(getCurrentNepaliFiscalYear());
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().slice(0, 10));
  const [voucherType, setVoucherType] = useState<VoucherType | "">("");
  const [voucherNo, setVoucherNo] = useState("");

  // ── Entry Lines (default 2 empty) ──
  const [lines, setLines] = useState<EntryLine[]>([]);
  const [editLines, setEditLines] = useState<EntryLine[]>([emptyLine()]);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);

  // ── Narration & Attachment ──
  const [narration, setNarration] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Delete Confirmation ──
  const [deleteTarget, setDeleteTarget] = useState<{ type: "line" | "attachment"; id?: string } | null>(null);
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ── Create Ledger Dialogs ──
  const [createLedgerOpen, setCreateLedgerOpen] = useState(false);
  const [createSubLedgerOpen, setCreateSubLedgerOpen] = useState(false);

  // ── Input Refs for Tab/Enter navigation ──
  const inputRefs = useRef<Record<string, HTMLInputElement | HTMLButtonElement | null>>({});

  // ── Hooks ──
  const { data: accounts } = useAccounts();
  const createJournalEntry = useCreateJournalEntry();
  const postJournalEntry = usePostJournalEntry();
  const { data: locSettings } = useLocalizationSettings();
  const calendarMode = locSettings?.calendar_mode || "AD";

  // ── Derived ──
  const isHeaderComplete = !!transactionDate && !!voucherType;
  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  const isBalanced = lines.length >= 2 && Math.abs(totalDebit - totalCredit) < 0.01;

  // ── Fiscal year date constraints ──
  const fyRange = useMemo(() => getFiscalYearADRange(fiscalYear), [fiscalYear]);
  const todayISO = new Date().toISOString().slice(0, 10);
  const maxDate = fyRange.maxDate > todayISO ? todayISO : fyRange.maxDate;
  const minDate = fyRange.minDate;

  // Clamp transaction date when fiscal year changes
  useEffect(() => {
    if (transactionDate < minDate) setTransactionDate(minDate);
    else if (transactionDate > maxDate) setTransactionDate(maxDate);
  }, [fiscalYear, minDate, maxDate]);

  useEffect(() => {
    let isMounted = true;

    const loadForEdit = async () => {
      if (!editEntryId) return;
      setIsLoadingEdit(true);

      const { data, error } = await supabase
        .from("journal_entries")
        .select(`
          *,
          journal_lines (*)
        `)
        .eq("id", editEntryId)
        .single();

      if (!isMounted) return;

      if (error || !data) {
        toast.error("Unable to load voucher for editing");
        return;
      }

      const referenceValue = data.reference || data.entry_number || "";
      const prefix = referenceValue.split("-")[0];
      const detectedType = PREFIX_TO_TYPE[prefix as keyof typeof PREFIX_TO_TYPE];

      setTransactionDate(data.date);
      setNarration(data.description || "");
      setVoucherNo(referenceValue);
      if (detectedType) setVoucherType(detectedType);
      else setVoucherType("journal");
      setLines(
        (data.journal_lines || []).map((line: any) => ({
          id: line.id,
          account_id: line.account_id,
          sub_account: "",
          debit: Number(line.debit) || 0,
          credit: Number(line.credit) || 0,
          remarks: line.description || "",
        }))
      );
      setEditLines([emptyLine()]);
      setEditingLineId(null);
    };

    loadForEdit().finally(() => {
      if (isMounted) setIsLoadingEdit(false);
    });

    return () => {
      isMounted = false;
    };
  }, [editEntryId]);

  useEffect(() => {
    if (voucherType && !isEditMode) {
      generateVoucherNo(voucherType as VoucherType, fiscalYear).then(setVoucherNo);
    }
  }, [voucherType, fiscalYear, isEditMode]);

  // ── Add line from edit row ──
  const handleAddEditLine = (index: number) => {
    const line = editLines[index];
    if (!line.account_id) { toast.error("Please select a Ledger Account"); return; }
    if (line.debit === 0 && line.credit === 0) { toast.error("Enter Debit or Credit amount"); return; }
    if (line.debit > 0 && line.credit > 0) { toast.error("A line cannot have both Debit and Credit"); return; }

    setLines(prev => [...prev, { ...line, id: line.id || generateId() }]);

    // Replace with new empty line
    setEditLines(prev => {
      const next = [...prev];
      next[index] = emptyLine();
      return next;
    });

    // Auto-fill next empty edit line with balancing amount
    setTimeout(() => {
      setEditLines(prev => {
        const allLines = [...lines, line];
        const d = allLines.reduce((s, l) => s + l.debit, 0);
        const c = allLines.reduce((s, l) => s + l.credit, 0);
        const diff = d - c;
        const emptyIdx = prev.findIndex(p => !p.account_id);
        if (emptyIdx >= 0 && Math.abs(diff) > 0.001) {
          const next = [...prev];
          next[emptyIdx] = {
            ...next[emptyIdx],
            debit: diff < 0 ? parseFloat(Math.abs(diff).toFixed(2)) : 0,
            credit: diff > 0 ? parseFloat(diff.toFixed(2)) : 0,
          };
          return next;
        }
        return prev;
      });
    }, 0);
  };

  const handleDeleteLine = (id: string) => {
    setLines(prev => prev.filter(l => l.id !== id));
    toast.success("Line removed");
    setDeleteTarget(null);
  };

  const handleEditLine = (line: EntryLine) => {
    // Remove from committed lines, put into first empty edit slot
    setLines(prev => prev.filter(l => l.id !== line.id));
    setEditLines(prev => {
      const emptyIdx = prev.findIndex(p => !p.account_id);
      if (emptyIdx >= 0) {
        const next = [...prev];
        next[emptyIdx] = { ...line };
        return next;
      }
      return [...prev, { ...line }];
    });
    setEditingLineId(line.id);
  };

  const handleSave = async (andNew: boolean) => {
    if (!narration.trim()) { toast.error("Narration is mandatory"); return; }
    if (lines.length < 2) { toast.error("At least two entry lines required"); return; }
    if (!isBalanced) { toast.error("Debit and Credit must be equal"); return; }

    setIsSaving(true);
    try {
      let targetEntryId: string;

      if (isEditMode && editEntryId) {
        const { error: entryError } = await supabase
          .from("journal_entries")
          .update({
            date: transactionDate,
            description: narration,
            reference: voucherNo || null,
            is_posted: false,
          })
          .eq("id", editEntryId);

        if (entryError) throw entryError;

        const { error: deleteLinesError } = await supabase
          .from("journal_lines")
          .delete()
          .eq("journal_entry_id", editEntryId);

        if (deleteLinesError) throw deleteLinesError;

        const { error: insertLinesError } = await supabase.from("journal_lines").insert(
          lines.map((l) => ({
            journal_entry_id: editEntryId,
            account_id: l.account_id,
            debit: l.debit,
            credit: l.credit,
            description: l.remarks || null,
          }))
        );

        if (insertLinesError) throw insertLinesError;
        targetEntryId = editEntryId;
      } else {
        const entry = await createJournalEntry.mutateAsync({
          date: transactionDate,
          description: narration,
          reference: voucherNo || null,
          lines: lines.map(l => ({
            account_id: l.account_id,
            debit: l.debit,
            credit: l.credit,
            description: l.remarks || null,
          })),
        });
        targetEntryId = entry.id;
      }

      await postJournalEntry.mutateAsync(targetEntryId);
      toast.success(`${VOUCHER_LABELS[voucherType as VoucherType] || "Entry"} saved & posted — ${voucherNo}`);

      if (andNew) {
        setLines([]);
        setEditLines([emptyLine()]);
        setNarration("");
        setAttachment(null);
        setAttachmentPreview(null);
        setEditingLineId(null);

        if (isEditMode) {
          navigate("/finance/journal/new");
        } else {
          generateVoucherNo(voucherType as VoucherType, fiscalYear).then(setVoucherNo);
        }
      } else {
        navigate("/finance?tab=transactions");
      }
    } catch {
      toast.error("Failed to save entry");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { toast.error("File must be under 1 MB"); return; }
    if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type)) {
      toast.error("Only JPG, PNG, WEBP or PDF allowed"); return;
    }
    setAttachment(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setAttachmentPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setAttachmentPreview(null);
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
    setAttachmentPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setDeleteTarget(null);
  };

  const getAccountName = (id: string) => {
    const acc = accounts?.find(a => a.id === id);
    return acc ? `${acc.code} - ${acc.name}` : id;
  };

  // ── Tab/Enter navigation helper ──
  const NAV_FIELDS = ["account", "sub_account", "debit", "credit", "remarks", "add"];
  const handleFieldKeyDown = (e: React.KeyboardEvent, lineIdx: number, fieldIdx: number) => {
    if (e.key === "Enter" || e.key === "Tab") {
      if (e.key === "Enter") e.preventDefault();
      // If on add button and pressing enter, trigger add
      if (NAV_FIELDS[fieldIdx] === "add" && e.key === "Enter") {
        handleAddEditLine(lineIdx);
        // Focus first field of same row after reset
        setTimeout(() => {
          const ref = inputRefs.current[`${lineIdx}-0`];
          if (ref) ref.focus();
        }, 50);
        return;
      }
      if (e.key === "Enter") {
        // Move to next field
        const nextField = fieldIdx + 1;
        if (nextField < NAV_FIELDS.length) {
          const ref = inputRefs.current[`${lineIdx}-${nextField}`];
          if (ref) ref.focus();
        } else {
          // Move to add button
          handleAddEditLine(lineIdx);
          setTimeout(() => {
            const ref = inputRefs.current[`${lineIdx}-0`];
            if (ref) ref.focus();
          }, 50);
        }
      }
    }
  };

  const updateEditLine = (index: number, updates: Partial<EntryLine>) => {
    setEditLines(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  return (
    <MainLayout
      title="New Journal Entry"
      subtitle="Create journal, receipt, payment & contra vouchers"
    >
      <div className="space-y-4 max-w-6xl">
        {/* ═══ CARD 1: Voucher Header ═══ */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{isEditMode ? "Edit Voucher" : "Voucher Details"}</CardTitle>
              <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={() => navigate("/finance?tab=transactions")}>
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Journal Register
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 items-end">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Fiscal Year *</Label>
                <Select value={fiscalYear} onValueChange={setFiscalYear}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {getNepaliFiscalYears().map(fy => (
                      <SelectItem key={fy} value={fy}>{fy} BS</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {calendarMode === "AD" ? (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Transaction Date (AD) *</Label>
                  <Input
                    type="date"
                    value={transactionDate}
                    min={minDate}
                    max={maxDate}
                    onChange={e => {
                      const v = e.target.value;
                      if (v >= minDate && v <= maxDate) setTransactionDate(v);
                    }}
                    className="h-9 text-sm"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <NepaliDateInput
                    label="कारोबार मिति (BS) *"
                    value={transactionDate}
                    onChange={v => {
                      if (v >= minDate && v <= maxDate) setTransactionDate(v);
                    }}
                    showDual={false}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Voucher Type *</Label>
                <Select value={voucherType} onValueChange={(v) => setVoucherType(v as VoucherType)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(VOUCHER_LABELS) as VoucherType[]).map(vt => (
                      <SelectItem key={vt} value={vt}>{VOUCHER_LABELS[vt]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Voucher No</Label>
                <Input value={voucherNo} readOnly className="h-9 text-sm bg-muted/50 font-mono" placeholder="Auto-generated" />
              </div>
            </div>

            {!isHeaderComplete && (
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-md p-2">
                <Lock className="h-3.5 w-3.5" />
                Select a date and voucher type to unlock the entry box below.
              </div>
            )}

            {isHeaderComplete && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-medium">Add Entry Line</p>
                {editLines.map((editLine, idx) => (
                  <div key={editLine.id} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2 items-end mb-2">
                    <div className="lg:col-span-2 space-y-1">
                      <Label className="text-[10px]">Ledger Account *</Label>
                      <div className="flex gap-1">
                        <Select
                          value={editLine.account_id}
                          onValueChange={v => updateEditLine(idx, { account_id: v })}
                        >
                          <SelectTrigger
                            className="h-9 text-xs flex-1"
                            ref={el => { inputRefs.current[`${idx}-0`] = el as any; }}
                            onKeyDown={e => handleFieldKeyDown(e, idx, 0)}
                          >
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts?.map(acc => (
                              <SelectItem key={acc.id} value={acc.id} className="text-xs">{acc.code} - {acc.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setCreateLedgerOpen(true)} title="Create Ledger">
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Sub Account</Label>
                      <div className="flex gap-1">
                        <Input
                          placeholder="Sub acct"
                          value={editLine.sub_account}
                          onChange={e => updateEditLine(idx, { sub_account: e.target.value })}
                          className="h-9 text-xs flex-1"
                          ref={el => { inputRefs.current[`${idx}-1`] = el; }}
                          onKeyDown={e => handleFieldKeyDown(e, idx, 1)}
                        />
                        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setCreateSubLedgerOpen(true)} title="Create Sub-Ledger">
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Debit</Label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={editLine.debit || ""}
                        onChange={e => updateEditLine(idx, {
                          debit: parseFloat(e.target.value) || 0,
                          credit: parseFloat(e.target.value) ? 0 : editLine.credit,
                        })}
                        className="h-9 text-xs font-mono"
                        ref={el => { inputRefs.current[`${idx}-2`] = el; }}
                        onKeyDown={e => handleFieldKeyDown(e, idx, 2)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Credit</Label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={editLine.credit || ""}
                        onChange={e => updateEditLine(idx, {
                          credit: parseFloat(e.target.value) || 0,
                          debit: parseFloat(e.target.value) ? 0 : editLine.debit,
                        })}
                        className="h-9 text-xs font-mono"
                        ref={el => { inputRefs.current[`${idx}-3`] = el; }}
                        onKeyDown={e => handleFieldKeyDown(e, idx, 3)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Remarks</Label>
                      <div className="flex gap-1">
                        <Input
                          placeholder="Note"
                          value={editLine.remarks}
                          onChange={e => updateEditLine(idx, { remarks: e.target.value })}
                          className="h-9 text-xs"
                          ref={el => { inputRefs.current[`${idx}-4`] = el; }}
                          onKeyDown={e => handleFieldKeyDown(e, idx, 4)}
                        />
                        <Button
                          size="sm"
                          className="h-9 px-3 shrink-0"
                          onClick={() => handleAddEditLine(idx)}
                          ref={el => { inputRefs.current[`${idx}-5`] = el; }}
                          onKeyDown={e => handleFieldKeyDown(e, idx, 5)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ═══ CARD 2: Entries Table ═══ */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              Entries
              {lines.length > 0 && <Badge variant="secondary" className="text-xs">{lines.length} line{lines.length > 1 ? "s" : ""}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {lines.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                {isHeaderComplete ? "No entries yet — add lines above" : "Complete the voucher header to start adding entries"}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">Action</TableHead>
                        <TableHead>Ledger Account</TableHead>
                        <TableHead>Sub Account</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                        <TableHead>Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence mode="popLayout">
                        {lines.map((line) => (
                          <motion.tr
                            key={line.id}
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className="border-b transition-colors hover:bg-muted/50"
                          >
                            <TableCell className="p-2">
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditLine(line)}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost" size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => setDeleteTarget({ type: "line", id: line.id })}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs font-medium">{getAccountName(line.account_id)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{line.sub_account || "—"}</TableCell>
                            <TableCell className="text-right font-mono text-xs">{line.debit > 0 ? line.debit.toFixed(2) : "—"}</TableCell>
                            <TableCell className="text-right font-mono text-xs">{line.credit > 0 ? line.credit.toFixed(2) : "—"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{line.remarks || "—"}</TableCell>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>
                <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
                  <span className="text-xs font-medium text-muted-foreground">Totals</span>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground block">Debit</span>
                      <span className="font-mono text-sm font-semibold">{totalDebit.toFixed(2)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground block">Credit</span>
                      <span className="font-mono text-sm font-semibold">{totalCredit.toFixed(2)}</span>
                    </div>
                    <Badge variant={isBalanced ? "default" : "destructive"} className="text-xs">
                      {isBalanced ? "✓ Balanced" : `Diff: ${Math.abs(totalDebit - totalCredit).toFixed(2)}`}
                    </Badge>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ═══ CARD 3: Narration, Attachment & Save ═══ */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Narration *</Label>
              <Textarea placeholder="What is this entry for? (mandatory)" value={narration} onChange={e => setNarration(e.target.value)} rows={3} className="text-sm resize-none" />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              {/* Attachment */}
              <div className="space-y-2 flex-1">
                <Label className="text-xs font-medium">Attachment (max 1 MB — JPG, PNG, PDF)</Label>
                <div className="flex items-center gap-3">
                  <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" className="hidden" onChange={handleFileChange} />
                  {!attachment ? (
                    <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={() => fileInputRef.current?.click()}>
                      <Paperclip className="h-3.5 w-3.5" /> Attach File
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-2 text-xs">
                      <Paperclip className="h-3.5 w-3.5 text-primary" />
                      <span className="truncate max-w-[200px]">{attachment.name}</span>
                      <span className="text-muted-foreground">({(attachment.size / 1024).toFixed(0)} KB)</span>
                      {(attachmentPreview || attachment.type === "application/pdf") && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPreviewOpen(true)}>
                          <Eye className="h-3 w-3" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setDeleteTarget({ type: "attachment" })}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Save Buttons - Right aligned */}
              <div className="flex items-center gap-2 sm:pt-5 shrink-0">
                <Button variant="outline" className="gap-2" onClick={() => handleSave(true)} disabled={isSaving || isLoadingEdit || !isHeaderComplete}>
                  <FilePlus className="h-4 w-4" /> Save & New
                </Button>
                <Button className="gap-2" onClick={() => handleSave(false)} disabled={isSaving || isLoadingEdit || !isHeaderComplete}>
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Attachment Preview Dialog ── */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Attachment Preview</DialogTitle></DialogHeader>
            <div className="max-h-[70vh] overflow-auto">
              {attachmentPreview ? (
                <img src={attachmentPreview} alt="Attachment" className="w-full rounded-md" />
              ) : attachment?.type === "application/pdf" ? (
                <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
                  <Paperclip className="h-10 w-10" />
                  <p className="text-sm">PDF file: {attachment.name}</p>
                  <Button variant="outline" size="sm" onClick={() => { const url = URL.createObjectURL(attachment); window.open(url, "_blank"); }}>Open in New Tab</Button>
                </div>
              ) : null}
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Delete Confirmation Dialog ── */}
        <AlertDialog open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTarget?.type === "line"
                  ? "Are you sure you want to delete this entry line? This action cannot be undone."
                  : "Are you sure you want to remove the attachment?"}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (deleteTarget?.type === "line" && deleteTarget.id) handleDeleteLine(deleteTarget.id);
                  else if (deleteTarget?.type === "attachment") removeAttachment();
                }}
              >
                Yes, Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ── Create Ledger Dialogs ── */}
        <CreateLedgerDialog open={createLedgerOpen} onOpenChange={setCreateLedgerOpen} type="ledger" accounts={accounts} />
        <CreateLedgerDialog open={createSubLedgerOpen} onOpenChange={setCreateSubLedgerOpen} type="sub_ledger" accounts={accounts} />
      </div>
    </MainLayout>
  );
}
