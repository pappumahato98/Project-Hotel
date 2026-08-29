import { useState, useEffect } from "react";
import { Menu, Moon, Sun, Calendar, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useSidebar } from "@/hooks/use-sidebar";
import { HeaderSearch } from "./header/HeaderSearch";
import { HeaderNotifications } from "./header/HeaderNotifications";
import { HeaderUserMenu } from "./header/HeaderUserMenu";
import { Hotel, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { todayBS, formatBSDate } from "@/lib/nepaliDate";
import { formatAD, cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocalizationSettings, useUpdateLocalizationSettings } from "@/hooks/useSettings";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { isMobile, collapsed, toggleCollapsed, setMobileOpen } = useSidebar();
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const bsToday = todayBS();
  const bsFormatted = formatBSDate(bsToday, "short");
  const adFormatted = formatAD(new Date());
  const { data: locSettings } = useLocalizationSettings();
  const updateLoc = useUpdateLocalizationSettings();

  const toggleCalendar = () => {
    if (locSettings) {
      updateLoc.mutate({
        ...locSettings,
        calendar_mode: locSettings.calendar_mode === "AD" ? "BS" : "AD"
      });
    }
  };

  return (
    <header className="fixed top-0 left-0 w-full z-50 flex h-14 items-center border-b border-border/60 bg-background/80 backdrop-blur-xl px-3 sm:px-4 lg:px-6 gap-2 sm:gap-4">
      {/* Left Section: Brand & Sidebar Toggle */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-[1_0_0%]">
        <Button
          variant="ghost"
          size="icon"
          onClick={isMobile ? () => setMobileOpen(true) : toggleCollapsed}
          className="flex-shrink-0 text-muted-foreground hover:text-foreground hover:bg-secondary h-8 w-8"
        >
          {isMobile ? (
            <Menu className="h-4 w-4" />
          ) : (
            <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          )}
        </Button>
        
        <Link to="/" className="flex items-center gap-2.5 mr-4 flex-shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-blue flex-shrink-0">
            <Hotel className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-semibold text-gradient-blue hidden sm:block">
            Claude Hotel
          </span>
        </Link>
        
        <div className="min-w-0 hidden md:block border-l border-border/60 pl-4">
          <h1 className="text-sm sm:text-base font-display font-semibold text-foreground truncate leading-tight">{title}</h1>
          {subtitle && <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{subtitle}</p>}
        </div>
      </div>

      {/* Center Section: Search Bar (Desktop only centered) */}
      <div className="hidden lg:flex flex-[2_0_0%] justify-center">
        <div className="w-full max-w-[450px]">
          <HeaderSearch />
        </div>
      </div>

      {/* Right Section: Actions */}
      <div className="flex items-center justify-end gap-0.5 sm:gap-1 flex-[1_0_0%]">
        {/* Mobile Search - only shows when not desktop */}
        <div className="lg:hidden">
          <HeaderSearch />
        </div>

        {/* BS/AD Toggle Badge */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCalendar}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 h-auto rounded-md bg-primary/8 border border-primary/15 hover:bg-primary/15 mr-1"
            >
              <Calendar className="h-3 w-3 text-primary" />
              <span className="text-[10px] sm:text-xs font-medium text-primary uppercase">
                {locSettings?.calendar_mode === "BS" ? `${bsFormatted} BS` : `${adFormatted}`}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs">Switch to {locSettings?.calendar_mode === "BS" ? "AD" : "BS"} calendar</p>
          </TooltipContent>
        </Tooltip>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="text-muted-foreground hover:text-foreground hover:bg-secondary h-8 w-8"
        >
          {!mounted ? (
            <Moon className="h-4 w-4 opacity-0" />
          ) : resolvedTheme === "dark" ? (
            <Sun className="h-4 w-4 transition-all" />
          ) : (
            <Moon className="h-4 w-4 transition-all" />
          )}
        </Button>

        <HeaderNotifications />
        <HeaderUserMenu />
      </div>
    </header>
  );
}
