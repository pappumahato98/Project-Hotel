import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Keyboard, Command, Navigation, Zap } from "lucide-react";

interface KeyboardShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts = [
  {
    category: "Quick Actions",
    icon: Zap,
    items: [
      { keys: ["⌘", "K"], description: "Open Command Palette" },
      { keys: ["⌘", "N"], description: "New Booking" },
      { keys: ["⌘", "G"], description: "New Guest" },
      { keys: ["⌘", "R"], description: "New Room" },
      { keys: ["⌘", "M"], description: "New Maintenance Request" },
    ],
  },
  {
    category: "Navigation",
    icon: Navigation,
    items: [
      { keys: ["Alt", "H"], description: "Go to Dashboard (Home)" },
      { keys: ["Alt", "R"], description: "Go to Reservations" },
      { keys: ["Alt", "G"], description: "Go to Guests" },
      { keys: ["Alt", "O"], description: "Go to Rooms" },
      { keys: ["Alt", "B"], description: "Go to Payments" },
      { keys: ["Alt", "S"], description: "Go to Settings" },
    ],
  },
  {
    category: "General",
    icon: Keyboard,
    items: [
      { keys: ["?"], description: "Show Keyboard Shortcuts" },
      { keys: ["Esc"], description: "Close Dialogs" },
    ],
  },
];

export function KeyboardShortcutsModal({ open, onOpenChange }: KeyboardShortcutsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 mb-3">
                <section.icon className="h-4 w-4" />
                {section.category}
              </h3>
              <div className="space-y-2">
                {section.items.map((shortcut) => (
                  <div
                    key={shortcut.description}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, idx) => (
                        <span key={idx} className="flex items-center gap-1">
                          <Badge
                            variant="outline"
                            className="px-2 py-1 font-mono text-xs bg-background"
                          >
                            {key === "⌘" ? (
                              <span className="flex items-center gap-1">
                                <Command className="h-3 w-3" />
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
            </div>
          ))}
        </div>

        <div className="mt-6 p-3 rounded-lg border border-border bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            <span className="font-medium">Tip:</span> On Windows/Linux, use{" "}
            <Badge variant="outline" className="px-1 py-0 text-xs font-mono">
              Ctrl
            </Badge>{" "}
            instead of{" "}
            <Badge variant="outline" className="px-1 py-0 text-xs font-mono">
              ⌘
            </Badge>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
