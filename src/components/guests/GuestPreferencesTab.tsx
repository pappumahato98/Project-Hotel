import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useGuestPreferences } from "@/hooks/useGuestManagement";
import { Guest } from "@/hooks/useGuests";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Save, Settings } from "lucide-react";
import { toast } from "sonner";

const PREFERENCE_CATEGORIES = [
  { key: "room", label: "Room", items: [
    { key: "room_temperature", label: "Room Temperature" },
    { key: "pillow_type", label: "Pillow Type" },
    { key: "floor_preference", label: "Floor Preference" },
    { key: "bed_type", label: "Bed Type" },
    { key: "room_view", label: "Room View" },
  ]},
  { key: "dining", label: "Dining", items: [
    { key: "dietary", label: "Dietary Requirements" },
    { key: "cuisine_preference", label: "Cuisine Preference" },
    { key: "breakfast_time", label: "Breakfast Time" },
  ]},
  { key: "amenities", label: "Amenities", items: [
    { key: "newspaper", label: "Newspaper" },
    { key: "minibar", label: "Minibar Preference" },
    { key: "toiletries", label: "Toiletries Brand" },
  ]},
];

interface Props {
  guests: Guest[];
}

export function GuestPreferencesTab({ guests }: Props) {
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);

  return (
    <div className="space-y-6">
      {!selectedGuest ? (
        <Card variant="elevated">
          <CardHeader><CardTitle>Select a Guest to View Preferences</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {guests.map((g) => (
                <Button key={g.id} variant="outline" className="justify-start gap-2 h-auto py-3" onClick={() => setSelectedGuest(g)}>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gradient-blue text-primary-foreground text-xs">{g.first_name[0]}{g.last_name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <p className="font-medium">{g.first_name} {g.last_name}</p>
                    <p className="text-xs text-muted-foreground">{g.email || g.phone || "No contact"}</p>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Preferences for {selectedGuest.first_name} {selectedGuest.last_name}
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setSelectedGuest(null)}>Change Guest</Button>
          </div>
          <PreferencesEditor guestId={selectedGuest.id} />
        </>
      )}
    </div>
  );
}

function PreferencesEditor({ guestId }: { guestId: string }) {
  const { data: preferences = [], setPreference } = useGuestPreferences(guestId);
  const [newPref, setNewPref] = useState({ category: "", key: "", value: "" });

  const getPreferenceValue = (category: string, key: string) => {
    return preferences.find((p) => p.category === category && p.preference_key === key)?.preference_value || "";
  };

  const handleSave = (category: string, key: string, value: string) => {
    setPreference.mutate({ category, key, value }, {
      onSuccess: () => toast.success("Preference saved"),
      onError: () => toast.error("Failed to save preference"),
    });
  };

  const handleAddCustom = () => {
    if (!newPref.category || !newPref.key || !newPref.value) return;
    handleSave(newPref.category, newPref.key, newPref.value);
    setNewPref({ category: "", key: "", value: "" });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {PREFERENCE_CATEGORIES.map((cat) => (
        <Card key={cat.key} variant="elevated">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{cat.label} Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cat.items.map((item) => {
              const value = getPreferenceValue(cat.key, item.key);
              return (
                <PreferenceRow
                  key={item.key}
                  label={item.label}
                  value={value}
                  onSave={(v) => handleSave(cat.key, item.key, v)}
                />
              );
            })}
          </CardContent>
        </Card>
      ))}

      {/* Custom Preferences */}
      <Card variant="elevated">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Custom Preference
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Category</Label>
            <Input value={newPref.category} onChange={(e) => setNewPref({ ...newPref, category: e.target.value })} placeholder="e.g. transport" />
          </div>
          <div className="space-y-2">
            <Label>Key</Label>
            <Input value={newPref.key} onChange={(e) => setNewPref({ ...newPref, key: e.target.value })} placeholder="e.g. airport_pickup" />
          </div>
          <div className="space-y-2">
            <Label>Value</Label>
            <Input value={newPref.value} onChange={(e) => setNewPref({ ...newPref, value: e.target.value })} placeholder="e.g. Yes - Mercedes" />
          </div>
          <Button size="sm" onClick={handleAddCustom} disabled={!newPref.category || !newPref.key || !newPref.value}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </CardContent>
      </Card>

      {/* Existing Custom Preferences */}
      {preferences.filter((p) => !PREFERENCE_CATEGORIES.some((c) => c.key === p.category)).length > 0 && (
        <Card variant="elevated">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Custom Preferences</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {preferences
                .filter((p) => !PREFERENCE_CATEGORIES.some((c) => c.key === p.category))
                .map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-2 bg-secondary rounded">
                    <div>
                      <Badge variant="outline" className="mr-2">{p.category}</Badge>
                      <span className="text-sm">{p.preference_key}</span>
                    </div>
                    <span className="text-sm font-medium">{p.preference_value}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PreferenceRow({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  return (
    <div className="flex items-center justify-between gap-2">
      <Label className="text-sm whitespace-nowrap">{label}</Label>
      {editing ? (
        <div className="flex gap-1">
          <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="h-8 w-40" />
          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => { onSave(editValue); setEditing(false); }}>
            <Save className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setEditValue(value); setEditing(true); }}>
          {value || "Set..."}
        </Button>
      )}
    </div>
  );
}
