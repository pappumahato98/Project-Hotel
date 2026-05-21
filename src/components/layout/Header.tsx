import { Bell, Search, Plus, Menu, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSidebar } from "@/hooks/use-sidebar";
import { useQuickActions } from "@/contexts/QuickActionsContext";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { isMobile, setMobileOpen } = useSidebar();
  const { setNewBookingOpen, setCommandPaletteOpen } = useQuickActions();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 backdrop-blur-xl px-4 lg:px-6 gap-4">
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile Menu Button */}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            className="flex-shrink-0 text-foreground hover:bg-secondary"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl lg:text-2xl font-display font-semibold text-foreground truncate">{title}</h1>
          {subtitle && <p className="text-xs sm:text-sm text-muted-foreground truncate">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
        {/* Command Palette Trigger */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="hidden md:flex items-center gap-2 text-muted-foreground"
              onClick={() => setCommandPaletteOpen(true)}
            >
              <Command className="h-3.5 w-3.5" />
              <span className="text-xs">Quick Actions</span>
              <kbd className="pointer-events-none ml-1 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Open command palette (⌘K)</p>
          </TooltipContent>
        </Tooltip>

        {/* Search - hidden on small screens */}
        <div className="relative hidden lg:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search guests, reservations..."
            className="w-48 xl:w-64 pl-9 bg-secondary border-border"
          />
        </div>

        {/* Quick Action */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="blue" size="sm" className="gap-2" onClick={() => setNewBookingOpen(true)}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Booking</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>New Booking (⌘N)</p>
          </TooltipContent>
        </Tooltip>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            3
          </span>
        </Button>
      </div>
    </header>
  );
}

