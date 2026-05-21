import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Layout,
  Search,
  CheckCircle2,
  Circle,
  AlertCircle,
  Projector,
  Music,
  Flower2,
  Armchair,
  Lightbulb,
  Mic2,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

interface BanquetEvent {
  id: string;
  event_name: string;
  event_type: string;
  client_name: string;
  event_date: string;
  venue: string;
  guest_count: number;
  status: "inquiry" | "confirmed" | "in_progress" | "completed" | "cancelled";
}

interface SetupItem {
  id: string;
  name: string;
  category: string;
  completed: boolean;
  notes: string;
}

interface VenueSetup {
  id: string;
  eventId: string;
  layoutType: string;
  capacity: number | null;
  equipment_needed: string[];
  decoration_checklist: string[];
  status: "not_started" | "in_progress" | "completed";
  notes: string | null;
  setupItems: SetupItem[];
}

interface VenueSetupPanelProps {
  events: BanquetEvent[];
}

const layoutTypes = [
  { id: "theater", name: "Theater Style", icon: Armchair },
  { id: "banquet", name: "Banquet Rounds", icon: Circle },
  { id: "classroom", name: "Classroom", icon: Layout },
  { id: "cocktail", name: "Cocktail/Standing", icon: Music },
  { id: "ushaped", name: "U-Shaped", icon: Layout },
  { id: "boardroom", name: "Boardroom", icon: Layout },
];

const equipmentOptions = [
  { id: "projector", name: "Projector & Screen", icon: Projector },
  { id: "sound", name: "Sound System", icon: Music },
  { id: "microphones", name: "Wireless Microphones", icon: Mic2 },
  { id: "lighting", name: "Special Lighting", icon: Lightbulb },
  { id: "stage", name: "Stage Platform", icon: Layout },
  { id: "podium", name: "Podium/Lectern", icon: Layout },
];

const decorationOptions = [
  { id: "flowers", name: "Floral Arrangements", icon: Flower2 },
  { id: "linens", name: "Premium Linens", icon: Layout },
  { id: "centerpieces", name: "Centerpieces", icon: Flower2 },
  { id: "backdrop", name: "Photo Backdrop", icon: Layout },
  { id: "lighting", name: "Ambient Lighting", icon: Lightbulb },
  { id: "signage", name: "Custom Signage", icon: Layout },
];

const defaultSetupChecklist: Omit<SetupItem, "id">[] = [
  { name: "Clear and clean venue", category: "Preparation", completed: false, notes: "" },
  { name: "Set up tables", category: "Furniture", completed: false, notes: "" },
  { name: "Arrange chairs", category: "Furniture", completed: false, notes: "" },
  { name: "Install table linens", category: "Decor", completed: false, notes: "" },
  { name: "Set up centerpieces", category: "Decor", completed: false, notes: "" },
  { name: "Install AV equipment", category: "Technical", completed: false, notes: "" },
  { name: "Sound check", category: "Technical", completed: false, notes: "" },
  { name: "Lighting setup", category: "Technical", completed: false, notes: "" },
  { name: "Place signage", category: "Decor", completed: false, notes: "" },
  { name: "Final walkthrough", category: "Preparation", completed: false, notes: "" },
];

export function VenueSetupPanel({ events }: VenueSetupPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [checklistDialogOpen, setChecklistDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<BanquetEvent | null>(null);

  // Local state for venue setups (would be DB in production)
  const [venueSetups, setVenueSetups] = useState<VenueSetup[]>([]);

  const [newSetup, setNewSetup] = useState({
    layoutType: "banquet",
    tableCount: 10,
    chairCount: 80,
    stageRequired: false,
    danceFloor: false,
    equipment: [] as string[],
    decorations: [] as string[],
    setupNotes: "",
  });

  const [searchParams, setSearchParams] = useSearchParams();

  // Filter active events
  const activeEvents = useMemo(() => {
    return events.filter(
      (e) =>
        (e.status === "confirmed" || e.status === "in_progress") &&
        (e.event_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.client_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [events, searchQuery]);

  // Auto-open dialog if directed from quick setup
  useEffect(() => {
    const setupEventId = searchParams.get("setupEvent");
    const action = searchParams.get("setupAction");
    
    if (setupEventId && action === "setup_venue") {
      const event = events.find(e => e.id === setupEventId);
      if (event) {
        handleOpenSetupDialog(event);
        // Clear params after opening
        setSearchParams(prev => {
          prev.delete("setupEvent");
          prev.delete("setupAction");
          return prev;
        });
      }
    }
  }, [searchParams, events]);

  // Get setup for an event
  const getSetupForEvent = (eventId: string) => {
    return venueSetups.find((s) => s.eventId === eventId);
  };

  const handleOpenSetupDialog = (event: BanquetEvent) => {
    setSelectedEvent(event);
    const existingSetup = getSetupForEvent(event.id);
    if (existingSetup) {
      setNewSetup({
        layoutType: existingSetup.layoutType,
        tableCount: existingSetup.capacity || 0,
        chairCount: existingSetup.capacity || 0,
        stageRequired: false,
        danceFloor: false,
        equipment: existingSetup.equipment_needed,
        decorations: existingSetup.decoration_checklist,
        setupNotes: existingSetup.notes || "",
      });
    } else {
      setNewSetup({
        layoutType: "banquet",
        tableCount: Math.ceil(event.guest_count / 8),
        chairCount: event.guest_count,
        stageRequired: event.event_type === "wedding" || event.event_type === "corporate",
        danceFloor: event.event_type === "wedding" || event.event_type === "social",
        equipment: [],
        decorations: [],
        setupNotes: "",
      });
    }
    setSetupDialogOpen(true);
  };

  const handleOpenChecklist = (event: BanquetEvent) => {
    setSelectedEvent(event);
    setChecklistDialogOpen(true);
  };

  const handleSaveSetup = () => {
    if (!selectedEvent) return;

    const existingSetup = getSetupForEvent(selectedEvent.id);
    
    const setup: VenueSetup = {
      id: existingSetup?.id || crypto.randomUUID(),
      eventId: selectedEvent.id,
      layoutType: newSetup.layoutType,
      capacity: newSetup.chairCount,
      equipment_needed: newSetup.equipment,
      decoration_checklist: newSetup.decorations,
      status: existingSetup?.status || "not_started",
      notes: newSetup.setupNotes,
      setupItems: existingSetup?.setupItems || defaultSetupChecklist.map(item => ({ ...item, id: crypto.randomUUID() })),
    };

    setVenueSetups((prev) => {
      const existing = prev.findIndex((s) => s.eventId === selectedEvent.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = setup;
        return updated;
      }
      return [...prev, setup];
    });

    toast.success("Venue setup saved");
    setSetupDialogOpen(false);
    setSelectedEvent(null);
  };

  const handleToggleEquipment = (eq: string) => {
    setNewSetup((prev) => ({
      ...prev,
      equipment: prev.equipment.includes(eq)
        ? prev.equipment.filter((e) => e !== eq)
        : [...prev.equipment, eq],
    }));
  };

  const handleToggleDecoration = (dec: string) => {
    setNewSetup((prev) => ({
      ...prev,
      decorations: prev.decorations.includes(dec)
        ? prev.decorations.filter((d) => d !== dec)
        : [...prev.decorations, dec],
    }));
  };

  const handleToggleChecklistItem = (eventId: string, itemId: string) => {
    setVenueSetups((prev) =>
      prev.map((setup) => {
        if (setup.eventId === eventId) {
          const updatedItems = setup.setupItems.map((item) =>
            item.id === itemId ? { ...item, completed: !item.completed } : item
          );
          const completedCount = updatedItems.filter((i) => i.completed).length;
          let newStatus: VenueSetup["status"] = "not_started";
          if (completedCount === updatedItems.length) newStatus = "completed";
          else if (completedCount > 0) newStatus = "in_progress";

          return { ...setup, status: newStatus };
        }
        return setup;
      })
    );
  };

  const getSetupProgress = (setup: VenueSetup | undefined) => {
    if (!setup) return 0;
    const completed = setup.setupItems.filter((i) => i.completed).length;
    return (completed / setup.setupItems.length) * 100;
  };

  const statusColors: Record<string, string> = {
    not_started: "bg-muted text-muted-foreground border-muted",
    in_progress: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    completed: "bg-success/20 text-success border-success/30",
  };

  // Summary stats
  const stats = useMemo(() => {
    const total = venueSetups.length;
    const completed = venueSetups.filter((s) => s.status === "completed").length;
    const inProgress = venueSetups.filter((s) => s.status === "in_progress").length;
    const notStarted = venueSetups.filter((s) => s.status === "not_started").length;
    return { total, completed, inProgress, notStarted };
  }, [venueSetups]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Layout className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Setups</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Circle className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Not Started</p>
                <p className="text-2xl font-bold">{stats.notStarted}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <AlertCircle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layout className="h-5 w-5" />
            Venue Setup Tracking
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {activeEvents.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No confirmed events requiring setup
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Venue</TableHead>
                  <TableHead>Layout</TableHead>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeEvents.map((event) => {
                  const setup = getSetupForEvent(event.id);
                  const progress = getSetupProgress(setup);
                  const layout = setup
                    ? layoutTypes.find((l) => l.id === setup.layoutType)
                    : null;
                  return (
                    <TableRow key={event.id}>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-primary"
                          onClick={() => handleOpenSetupDialog(event)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{event.event_name}</p>
                          <p className="text-xs text-muted-foreground">{event.client_name}</p>
                        </div>
                      </TableCell>
                      <TableCell>{event.event_date}</TableCell>
                      <TableCell>{event.venue}</TableCell>
                      <TableCell>
                        {setup ? (
                          <Badge variant="outline">{layout?.name || setup.layoutType}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not set</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {setup && setup.equipment_needed.length > 0 ? (
                          <div className="flex items-center gap-1">
                            {setup.equipment_needed.slice(0, 2).map((eq) => {
                              const equip = equipmentOptions.find((e) => e.id === eq);
                              return equip ? (
                                <equip.icon key={eq} className="h-4 w-4 text-muted-foreground" />
                              ) : null;
                            })}
                            {setup.equipment_needed.length > 2 && (
                              <span className="text-xs text-muted-foreground">
                                +{setup.equipment_needed.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {setup ? (
                          <div className="w-24">
                            <Progress value={progress} className="h-2" />
                            <p className="text-xs text-muted-foreground mt-1">
                              {progress.toFixed(0)}%
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {setup ? (
                          <Badge variant="outline" className={statusColors[setup.status]}>
                            {setup.status.replace("_", " ")}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-muted">
                            No setup
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenSetupDialog(event)}
                          >
                            {setup ? "Edit" : "Setup"}
                          </Button>
                          {setup && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenChecklist(event)}
                            >
                              Checklist
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>



      {/* Setup Dialog */}
      <Dialog open={setupDialogOpen} onOpenChange={setSetupDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedEvent ? `Venue Setup for ${selectedEvent.event_name}` : "Venue Setup"}
            </DialogTitle>
            <DialogDescription>
              {selectedEvent && (
                <span>
                  {selectedEvent.venue} • {selectedEvent.guest_count} guests • {selectedEvent.event_date}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Layout Type */}
            <div className="space-y-2">
              <Label>Layout Type</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {layoutTypes.map((layout) => (
                  <div
                    key={layout.id}
                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                      newSetup.layoutType === layout.id
                        ? "bg-primary/10 border-primary"
                        : "hover:bg-secondary/50"
                    }`}
                    onClick={() => setNewSetup((p) => ({ ...p, layoutType: layout.id }))}
                  >
                    <layout.icon className="h-5 w-5" />
                    <span className="text-sm">{layout.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tables and Chairs */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Number of Tables</Label>
                <Input
                  type="number"
                  value={newSetup.tableCount}
                  onChange={(e) =>
                    setNewSetup((p) => ({ ...p, tableCount: parseInt(e.target.value) || 0 }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Number of Chairs</Label>
                <Input
                  type="number"
                  value={newSetup.chairCount}
                  onChange={(e) =>
                    setNewSetup((p) => ({ ...p, chairCount: parseInt(e.target.value) || 0 }))
                  }
                />
              </div>
            </div>

            {/* Special Requirements */}
            <div className="flex gap-4">
              <div
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer flex-1 ${
                  newSetup.stageRequired ? "bg-primary/10 border-primary" : ""
                }`}
                onClick={() => setNewSetup((p) => ({ ...p, stageRequired: !p.stageRequired }))}
              >
                <Checkbox checked={newSetup.stageRequired} />
                <span>Stage Required</span>
              </div>
              <div
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer flex-1 ${
                  newSetup.danceFloor ? "bg-primary/10 border-primary" : ""
                }`}
                onClick={() => setNewSetup((p) => ({ ...p, danceFloor: !p.danceFloor }))}
              >
                <Checkbox checked={newSetup.danceFloor} />
                <span>Dance Floor</span>
              </div>
            </div>

            {/* Equipment */}
            <div className="space-y-2">
              <Label>Equipment Needed</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {equipmentOptions.map((eq) => (
                  <div
                    key={eq.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer hover:bg-secondary/50 ${
                      newSetup.equipment.includes(eq.id) ? "bg-primary/10 border-primary" : ""
                    }`}
                    onClick={() => handleToggleEquipment(eq.id)}
                  >
                    <Checkbox checked={newSetup.equipment.includes(eq.id)} />
                    <eq.icon className="h-4 w-4" />
                    <span className="text-sm">{eq.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Decorations */}
            <div className="space-y-2">
              <Label>Decorations</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {decorationOptions.map((dec) => (
                  <div
                    key={dec.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer hover:bg-secondary/50 ${
                      newSetup.decorations.includes(dec.id) ? "bg-primary/10 border-primary" : ""
                    }`}
                    onClick={() => handleToggleDecoration(dec.id)}
                  >
                    <Checkbox checked={newSetup.decorations.includes(dec.id)} />
                    <dec.icon className="h-4 w-4" />
                    <span className="text-sm">{dec.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Setup Notes</Label>
              <Textarea
                placeholder="Any special instructions or requirements..."
                value={newSetup.setupNotes}
                onChange={(e) => setNewSetup((p) => ({ ...p, setupNotes: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSetupDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveSetup}>Save Setup</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Checklist Dialog */}
      <Dialog open={checklistDialogOpen} onOpenChange={setChecklistDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Setup Checklist</DialogTitle>
            <DialogDescription>
              {selectedEvent && selectedEvent.event_name}
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4">
              {(() => {
                const setup = getSetupForEvent(selectedEvent.id);
                if (!setup) return <p className="text-muted-foreground">No setup configured</p>;

                const categories = [...new Set(setup.setupItems.map((i) => i.category))];
                
                return categories.map((category) => (
                  <div key={category} className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">{category}</h4>
                    <div className="space-y-1">
                      {setup.setupItems
                        .filter((i) => i.category === category)
                        .map((item) => (
                          <div
                            key={item.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                              item.completed
                                ? "bg-success/10 border-success/30"
                                : "hover:bg-secondary/50"
                            }`}
                            onClick={() => handleToggleChecklistItem(selectedEvent.id, item.id)}
                          >
                            {item.completed ? (
                              <CheckCircle2 className="h-5 w-5 text-success" />
                            ) : (
                              <Circle className="h-5 w-5 text-muted-foreground" />
                            )}
                            <span className={item.completed ? "line-through text-muted-foreground" : ""}>
                              {item.name}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                ));
              })()}

              <div className="pt-4 border-t">
                <Progress value={getSetupProgress(getSetupForEvent(selectedEvent.id))} />
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  {getSetupProgress(getSetupForEvent(selectedEvent.id)).toFixed(0)}% Complete
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
