import { useState } from "react";
import { useGuestDocuments } from "@/hooks/useGuestDocuments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { FileText, Plus, Shield, ShieldAlert, Trash2 } from "lucide-react";
import { format, isPast, addMonths } from "date-fns";
import { formatAD } from "@/lib/utils";

interface GuestDocumentsProps {
  guestId: string;
  guestName: string;
}

const documentTypes = [
  { value: "passport", label: "Passport" },
  { value: "national_id", label: "National ID" },
  { value: "driving_license", label: "Driving License" },
  { value: "visa", label: "Visa" },
  { value: "other", label: "Other" },
];

export function GuestDocuments({ guestId, guestName }: GuestDocumentsProps) {
  const { data: documents = [], addDocument, deleteDocument } = useGuestDocuments(guestId);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({
    document_type: "passport",
    document_number: "",
    issuing_country: "",
    issue_date: "",
    expiry_date: "",
    notes: "",
  });

  const handleAdd = () => {
    addDocument.mutate({
      guest_id: guestId,
      document_type: form.document_type,
      document_number: form.document_number || null,
      issuing_country: form.issuing_country || null,
      issue_date: form.issue_date || null,
      expiry_date: form.expiry_date || null,
      file_url: null,
      verified: false,
      notes: form.notes || null,
    }, {
      onSuccess: () => {
        setIsAddOpen(false);
        setForm({ document_type: "passport", document_number: "", issuing_country: "", issue_date: "", expiry_date: "", notes: "" });
      },
    });
  };

  const getExpiryBadge = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    const expiry = new Date(expiryDate);
    if (isPast(expiry)) return <Badge variant="destructive">Expired</Badge>;
    if (isPast(addMonths(new Date(), -3))) return <Badge variant="warning">Expiring Soon</Badge>;
    return <Badge variant="success">Valid</Badge>;
  };

  return (
    <Card variant="elevated">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4 text-primary" />
          Identity Documents
        </CardTitle>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1"><Plus className="h-3 w-3" /> Add Document</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Document for {guestName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Document Type</Label>
                <Select value={form.document_type} onValueChange={(v) => setForm({ ...form, document_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {documentTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Document Number</Label>
                  <Input value={form.document_number} onChange={(e) => setForm({ ...form, document_number: e.target.value })} placeholder="AB1234567" />
                </div>
                <div className="space-y-2">
                  <Label>Issuing Country</Label>
                  <Input value={form.issuing_country} onChange={(e) => setForm({ ...form, issuing_country: e.target.value })} placeholder="United States" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Issue Date</Label>
                  <Input type="date" value={form.issue_date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Expiry Date</Label>
                  <Input type="date" value={form.expiry_date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={addDocument.isPending}>
                {addDocument.isPending ? "Saving..." : "Save Document"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No documents on file</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Number</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium capitalize">{doc.document_type.replace("_", " ")}</TableCell>
                  <TableCell className="font-mono text-sm">{doc.document_number || "-"}</TableCell>
                  <TableCell>{doc.issuing_country || "-"}</TableCell>
                  <TableCell>{doc.expiry_date ? formatAD(new Date(doc.expiry_date)) : "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {doc.verified ? (
                        <Badge variant="success" className="gap-1"><Shield className="h-3 w-3" /> Verified</Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1"><ShieldAlert className="h-3 w-3" /> Unverified</Badge>
                      )}
                      {getExpiryBadge(doc.expiry_date)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => deleteDocument.mutate(doc.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
