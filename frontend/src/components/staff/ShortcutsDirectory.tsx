import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Keyboard, Command, Navigation, Zap, Info } from "lucide-react";

const shortcuts = [
  {
    category: "Quick Actions",
    icon: Zap,
    description: "Create new records quickly",
    items: [
      { keys: ["⌘/Ctrl", "K"], description: "Open Command Palette", usage: "Access all commands" },
      { keys: ["⌘/Ctrl", "N"], description: "New Booking", usage: "Create reservation directly" },
      { keys: ["⌘/Ctrl", "G"], description: "New Guest", usage: "Register new guest" },
      { keys: ["⌘/Ctrl", "R"], description: "New Room", usage: "Add room to inventory" },
      { keys: ["⌘/Ctrl", "M"], description: "New Maintenance", usage: "Report maintenance issue" },
    ],
  },
  {
    category: "Navigation Shortcuts",
    icon: Navigation,
    description: "Navigate between modules",
    items: [
      { keys: ["Alt", "H"], description: "Dashboard (Home)", usage: "Go to main dashboard" },
      { keys: ["Alt", "R"], description: "Reservations", usage: "View all reservations" },
      { keys: ["Alt", "G"], description: "Guests", usage: "Guest directory" },
      { keys: ["Alt", "O"], description: "Rooms", usage: "Room inventory" },
      { keys: ["Alt", "B"], description: "Payments", usage: "Financial overview" },
      { keys: ["Alt", "S"], description: "Settings", usage: "System configuration" },
    ],
  },
  {
    category: "General Shortcuts",
    icon: Keyboard,
    description: "System-wide actions",
    items: [
      { keys: ["?"], description: "Show Shortcuts Help", usage: "Display this modal anywhere" },
      { keys: ["Esc"], description: "Close Dialog/Modal", usage: "Dismiss open dialogs" },
    ],
  },
];

export function ShortcutsDirectory() {
  return (
    <div className="space-y-6">
      <Card variant="glass" className="p-4 border-primary/20 bg-primary/5">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <p className="font-medium">Keyboard Shortcuts Reference</p>
            <p className="text-sm text-muted-foreground">
              Use these shortcuts to navigate and perform actions faster. Press <Badge variant="outline" className="mx-1 px-1 text-xs font-mono">?</Badge> anywhere to see this help.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-6">
        {shortcuts.map((section) => (
          <Card key={section.category} variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <section.icon className="h-5 w-5 text-primary" />
                {section.category}
              </CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {section.items.map((shortcut) => (
                  <div
                    key={shortcut.description}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{shortcut.description}</p>
                      <p className="text-sm text-muted-foreground">{shortcut.usage}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, idx) => (
                        <span key={idx} className="flex items-center gap-1">
                          <Badge
                            variant="outline"
                            className="px-2 py-1 font-mono text-xs bg-background"
                          >
                            {key === "⌘/Ctrl" ? (
                              <span className="flex items-center gap-1">
                                <Command className="h-3 w-3" />
                                /Ctrl
                              </span>
                            ) : (
                              key
                            )}
                          </Badge>
                          {idx < shortcut.keys.length - 1 && (
                            <span className="text-muted-foreground text-xs">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="p-4 border-muted">
        <p className="text-sm text-muted-foreground text-center">
          <span className="font-medium">Pro Tip:</span> Combine these shortcuts with the Command Palette (<Badge variant="outline" className="px-1 py-0 text-xs font-mono">⌘K</Badge>) for maximum efficiency.
        </p>
      </Card>
    </div>
  );
}
