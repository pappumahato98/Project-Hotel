import { useState, useMemo } from "react";
import { useGuests, Guest } from "@/hooks/useGuests";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { GitMerge, Search, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";

const db = supabase as any;

export function GuestMergeTool() {
  const { data: guests = [] } = useGuests();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [primaryId, setPrimaryId] = useState<string | null>(null);
  const [isMerging, setIsMerging] = useState(false);

  // Find duplicates by name/email similarity
  const duplicateGroups = useMemo(() => {
    const groups: Guest[][] = [];
    const seen = new Set<string>();

    guests.forEach((g) => {
      if (seen.has(g.id)) return;
      const key = `${g.first_name.toLowerCase()}_${g.last_name.toLowerCase()}`;
      const matches = guests.filter(
        (other) =>
          other.id !== g.id &&
          !seen.has(other.id) &&
          (
            `${other.first_name.toLowerCase()}_${other.last_name.toLowerCase()}` === key ||
            (g.email && other.email && g.email.toLowerCase() === other.email.toLowerCase()) ||
            (g.phone && other.phone && g.phone.replace(/\D/g, "") === other.phone.replace(/\D/g, ""))
          )
      );
      if (matches.length > 0) {
        const group = [g, ...matches];
        group.forEach((m) => seen.add(m.id));
        groups.push(group);
      }
    });
    return groups;
  }, [guests]);

  const filteredGroups = useMemo(() => {
    if (!search) return duplicateGroups;
    const s = search.toLowerCase();
    return duplicateGroups.filter((group) =>
      group.some((g) =>
        `${g.first_name} ${g.last_name}`.toLowerCase().includes(s) ||
        g.email?.toLowerCase().includes(s)
      )
    );
  }, [duplicateGroups, search]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
      if (primaryId === id) setPrimaryId(null);
    } else {
      next.add(id);
      if (!primaryId) setPrimaryId(id);
    }
    setSelectedIds(next);
  };

  const handleMerge = async () => {
    if (!primaryId || selectedIds.size < 2) {
      toast.error("Select at least 2 guests and mark one as primary");
      return;
    }
    setIsMerging(true);
    try {
      const secondaryIds = [...selectedIds].filter((id) => id !== primaryId);
      // Update foreign keys in related tables to point to primary guest
      const tables = ["reservations", "guest_feedback", "guest_communications", "guest_preferences", "guest_messages", "guest_documents", "loyalty_members"];
      for (const table of tables) {
        const { error } = await db
          .from(table)
          .update({ guest_id: primaryId })
          .in("guest_id", secondaryIds);
        // Ignore errors for tables that might not have data
        if (error && !error.message.includes("0 rows")) console.warn(`Merge ${table}:`, error.message);
      }
      // Aggregate spending/visits to primary
      const secondaryGuests = guests.filter((g) => secondaryIds.includes(g.id));
      const primary = guests.find((g) => g.id === primaryId);
      if (primary) {
        const totalVisits = (primary.total_visits || 0) + secondaryGuests.reduce((s, g) => s + (g.total_visits || 0), 0);
        const totalSpending = (primary.total_spending || 0) + secondaryGuests.reduce((s, g) => s + (g.total_spending || 0), 0);
        await db.from("guests").update({ total_visits: totalVisits, total_spending: totalSpending }).eq("id", primaryId);
      }
      // Delete secondary profiles
      for (const id of secondaryIds) {
        await db.from("guests").delete().eq("id", id);
      }
      toast.success(`Merged ${selectedIds.size} profiles into one`);
      setSelectedIds(new Set());
      setPrimaryId(null);
      queryClient.invalidateQueries({ queryKey: ["guests"] });
    } catch (e: any) {
      toast.error("Merge failed: " + e.message);
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold font-display flex items-center gap-2">
            <GitMerge className="h-5 w-5 text-primary" />
            Guest De-duplication
          </h3>
          <p className="text-sm text-muted-foreground">
            {duplicateGroups.length} potential duplicate group{duplicateGroups.length !== 1 ? "s" : ""} found
          </p>
        </div>
        <Button
          onClick={handleMerge}
          disabled={selectedIds.size < 2 || !primaryId || isMerging}
          className="gap-2"
        >
          <GitMerge className="h-4 w-4" />
          {isMerging ? "Merging..." : `Merge ${selectedIds.size} Selected`}
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search duplicate groups..." className="pl-9" />
      </div>

      {filteredGroups.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          {duplicateGroups.length === 0 ? "No duplicate guests detected!" : "No matches for your search."}
        </CardContent></Card>
      ) : (
        filteredGroups.map((group, gi) => (
          <Card key={gi} variant="elevated">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Potential Duplicates ({group.length} profiles)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Visits</TableHead>
                    <TableHead>Spending</TableHead>
                    <TableHead>Primary</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.map((g) => (
                    <TableRow key={g.id} className={primaryId === g.id ? "bg-primary/5" : ""}>
                      <TableCell>
                        <Checkbox checked={selectedIds.has(g.id)} onCheckedChange={() => toggleSelect(g.id)} />
                      </TableCell>
                      <TableCell className="font-medium">
                        {g.first_name} {g.last_name}
                        {g.is_vip && <Badge variant="outline" className="ml-2 text-[10px]">VIP</Badge>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{g.email || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{g.phone || "-"}</TableCell>
                      <TableCell>{g.total_visits || 0}</TableCell>
                      <TableCell className="text-primary font-medium">{formatCurrency(g.total_spending || 0)}</TableCell>
                      <TableCell>
                        {selectedIds.has(g.id) && (
                          <Button
                            variant={primaryId === g.id ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPrimaryId(g.id)}
                          >
                            {primaryId === g.id ? "Primary ✓" : "Set Primary"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
