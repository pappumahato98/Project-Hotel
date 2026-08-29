import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Plus,
  Search,
  Loader2,
  Phone,
  Mail,
  Building2,
  Calendar,
  Edit,
  Trash2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { formatAD } from "@/lib/utils";
import { useIsAdmin } from "@/hooks/useUserRole";

interface StaffMember {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  department: string;
  position: string;
  hire_date: string;
  status: string;
  salary: number | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  notes: string | null;
  avatar_url?: string | null;
  created_at: string;
}

const departments = [
  "Front Desk",
  "Housekeeping",
  "Food & Beverage",
  "Maintenance",
  "Security",
  "Management",
  "Accounting",
  "Human Resources",
];

const statusColors: Record<string, string> = {
  active: "bg-success/20 text-success border-success/30",
  inactive: "bg-muted text-muted-foreground border-border",
  on_leave: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  terminated: "bg-destructive/20 text-destructive border-destructive/30",
};

export const StaffDirectoryTab = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const { isAdmin } = useIsAdmin();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    employee_id: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    department: "",
    position: "",
    hire_date: new Date().toISOString().split("T")[0],
    status: "active",
    salary: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    notes: "",
  });

  // Fetch staff members
  const { data: staffMembers = [], isLoading } = useQuery({
    queryKey: ["staff-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_members")
        .select("*")
        .order("last_name", { ascending: true });

      if (error) throw error;
      return data as StaffMember[];
    },
  });

  // Create staff member
  const createStaff = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("staff_members").insert({
        employee_id: data.employee_id,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email || null,
        phone: data.phone || null,
        department: data.department,
        position: data.position,
        hire_date: data.hire_date,
        status: data.status,
        salary: data.salary ? parseFloat(data.salary) : null,
        emergency_contact_name: data.emergency_contact_name || null,
        emergency_contact_phone: data.emergency_contact_phone || null,
        notes: data.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-members"] });
      toast.success("Staff member added successfully");
      resetForm();
      setDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Failed to add staff: " + error.message);
    },
  });

  // Update staff member
  const updateStaff = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("staff_members")
        .update({
          employee_id: data.employee_id,
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email || null,
          phone: data.phone || null,
          department: data.department,
          position: data.position,
          hire_date: data.hire_date,
          status: data.status,
          salary: data.salary ? parseFloat(data.salary) : null,
          emergency_contact_name: data.emergency_contact_name || null,
          emergency_contact_phone: data.emergency_contact_phone || null,
          notes: data.notes || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-members"] });
      toast.success("Staff member updated successfully");
      resetForm();
      setDialogOpen(false);
      setEditingStaff(null);
    },
    onError: (error) => {
      toast.error("Failed to update staff: " + error.message);
    },
  });

  // Delete staff member
  const deleteStaff = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("staff_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-members"] });
      toast.success("Staff member removed");
    },
    onError: (error) => {
      toast.error("Failed to delete staff: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      employee_id: "",
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      department: "",
      position: "",
      hire_date: new Date().toISOString().split("T")[0],
      status: "active",
      salary: "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
      notes: "",
    });
    setEditingStaff(null);
  };

  const handleEdit = (staff: StaffMember) => {
    setEditingStaff(staff);
    setFormData({
      employee_id: staff.employee_id,
      first_name: staff.first_name,
      last_name: staff.last_name,
      email: staff.email || "",
      phone: staff.phone || "",
      department: staff.department,
      position: staff.position,
      hire_date: staff.hire_date,
      status: staff.status,
      salary: staff.salary?.toString() || "",
      emergency_contact_name: staff.emergency_contact_name || "",
      emergency_contact_phone: staff.emergency_contact_phone || "",
      notes: staff.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStaff) {
      updateStaff.mutate({ id: editingStaff.id, data: formData });
    } else {
      createStaff.mutate(formData);
    }
  };

  // Filter staff
  const filteredStaff = staffMembers.filter((staff) => {
    const matchesSearch =
      staff.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment = !departmentFilter || staff.department === departmentFilter;
    return matchesSearch && matchesDepartment;
  });

  return (
    <Card variant="elevated">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Staff Directory
            </CardTitle>
            <CardDescription>
              {staffMembers.length} total staff members
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full sm:w-48"
              />
            </div>
            <Select
              value={departmentFilter || "all"}
              onValueChange={(v) => setDepartmentFilter(v === "all" ? null : v)}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isAdmin && (
              <Dialog open={dialogOpen} onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button variant="blue" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Staff
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingStaff ? "Edit Staff Member" : "Add New Staff Member"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="employee_id">Employee ID *</Label>
                        <Input
                          id="employee_id"
                          value={formData.employee_id}
                          onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="status">Status *</Label>
                        <Select
                          value={formData.status}
                          onValueChange={(v) => setFormData({ ...formData, status: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="on_leave">On Leave</SelectItem>
                            <SelectItem value="terminated">Terminated</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="first_name">First Name *</Label>
                        <Input
                          id="first_name"
                          value={formData.first_name}
                          onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last_name">Last Name *</Label>
                        <Input
                          id="last_name"
                          value={formData.last_name}
                          onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="department">Department *</Label>
                        <Select
                          value={formData.department}
                          onValueChange={(v) => setFormData({ ...formData, department: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map((dept) => (
                              <SelectItem key={dept} value={dept}>
                                {dept}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="position">Position *</Label>
                        <Input
                          id="position"
                          value={formData.position}
                          onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="hire_date">Hire Date *</Label>
                        <Input
                          id="hire_date"
                          type="date"
                          value={formData.hire_date}
                          onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="salary">Salary</Label>
                        <Input
                          id="salary"
                          type="number"
                          value={formData.salary}
                          onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                        <Input
                          id="emergency_contact_name"
                          value={formData.emergency_contact_name}
                          onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                        <Input
                          id="emergency_contact_phone"
                          value={formData.emergency_contact_phone}
                          onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="blue"
                        disabled={createStaff.isPending || updateStaff.isPending}
                      >
                        {createStaff.isPending || updateStaff.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        {editingStaff ? "Update" : "Add"} Staff
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Hire Date</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 7 : 6} className="text-center text-muted-foreground py-8">
                      No staff members found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStaff.map((staff) => (
                    <TableRow key={staff.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={staff.avatar_url || ""} />
                            <AvatarFallback className="bg-primary/20 text-primary font-semibold text-sm">
                              {staff.first_name[0]}
                              {staff.last_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {staff.first_name} {staff.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">{staff.employee_id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {staff.department}
                        </div>
                      </TableCell>
                      <TableCell>{staff.position}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {staff.email && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {staff.email}
                            </div>
                          )}
                          {staff.phone && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {staff.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[staff.status] || statusColors.inactive}>
                          {staff.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {formatAD(new Date(staff.hire_date))}
                        </div>
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(staff)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => deleteStaff.mutate(staff.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
