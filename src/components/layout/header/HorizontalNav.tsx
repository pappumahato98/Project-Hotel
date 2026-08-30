import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { navItems, operationsNavItems, adminNavItems, NavItemConfig } from "@/config/navigation";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useUIPreferences, useUserRolesPermissions } from "@/hooks/useSettings";
import { MoreHorizontal } from "lucide-react";

export function HorizontalNav() {
  const location = useLocation();
  const { t } = useTranslation();
  const { isAdmin } = useIsAdmin();
  const { data: uiPrefs } = useUIPreferences();
  const { data: perms } = useUserRolesPermissions();
  const dropdownsEnabled = uiPrefs?.sidebar_dropdowns_enabled ?? true;

  const isItemActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const filterNavItems = (items: NavItemConfig[]) => {
    if (!perms?.modules) return items;
    return items.filter(item => {
      const m = perms.modules[item.label];
      return m?.enabled !== false && m?.view !== false;
    });
  };

  const renderNavItem = (item: NavItemConfig) => {
    const isActive = isItemActive(item.path);
    const translationKey = `nav.${item.label.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    const translatedLabel = t(translationKey, item.label);

    if (item.subItems && item.subItems.length > 0 && dropdownsEnabled) {
      return (
        <div key={item.path} className="flex items-center group relative">
          {isActive && (
            <motion.div
              layoutId="activeNav"
              className="absolute inset-0 bg-primary/10 rounded-md border border-primary/10 shadow-sm"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
          <Link
            to={item.path}
            className={cn(
              "relative z-10 flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold transition-all whitespace-nowrap rounded-l-md",
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
            )}
          >
            <item.icon className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive && "text-primary")} />
            {translatedLabel}
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "relative z-10 h-[32px] flex items-center px-1.5 transition-all border-l border-transparent rounded-r-md hover:bg-accent/40 hover:text-foreground",
                  isActive
                    ? "text-primary border-l-primary/20"
                    : "text-muted-foreground"
                )}
              >
                <ChevronDown className="h-3.5 w-3.5 opacity-60 transition-transform group-hover:translate-y-0.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[180px] p-1.5 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-2 py-1.5 mb-1 border-b border-border/40">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  {translatedLabel} Options
                </p>
              </div>
              {item.subItems.map((sub) => (
                <DropdownMenuItem key={sub.tab || sub.path} asChild>
                  <Link
                    to={sub.path || `${item.path}?tab=${sub.tab}`}
                    className="w-full cursor-pointer flex items-center gap-2 py-2 px-2.5 rounded-md text-sm font-medium transition-colors hover:bg-primary/5 hover:text-primary focus:bg-primary/5 focus:text-primary"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                    {sub.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    }

    return (
      <Link
        key={item.path}
        to={item.path}
        className={cn(
          "relative flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold rounded-md transition-all whitespace-nowrap",
          isActive
            ? "text-primary"
            : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
        )}
      >
        {isActive && (
          <motion.div
            layoutId="activeNav"
            className="absolute inset-0 bg-primary/10 rounded-md border border-primary/10 shadow-sm"
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
        <item.icon className={cn("relative z-10 h-4 w-4 transition-transform hover:scale-110", isActive && "text-primary")} />
        <span className="relative z-10">{translatedLabel}</span>
      </Link>
    );
  };

  const filteredMainItems = filterNavItems(navItems);
  const filteredOperationsItems = filterNavItems(operationsNavItems);
  const filteredAdminItems = isAdmin ? filterNavItems(adminNavItems) : [];

  const allEnabledItems = [...filteredMainItems, ...filteredOperationsItems, ...filteredAdminItems];

  // Show top 10 items in the horizontal bar
  const visibleItems = allEnabledItems.slice(0, 10);
  // Anything after 10 goes into the More dropdown
  const moreItems = allEnabledItems.slice(10);

  return (
    <motion.div
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -10, opacity: 0 }}
      className="sticky top-14 z-20 w-full bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 border-b border-border/40 shadow-sm overflow-hidden"
    >
      <div className="px-4 h-12 flex items-center gap-1.5 overflow-x-auto scrollbar-hide no-scrollbar justify-center">
        {visibleItems.map(renderNavItem)}

        {moreItems.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold rounded-md transition-all whitespace-nowrap",
                moreItems.some(i => isItemActive(i.path))
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
              )}>
                <MoreHorizontal className="h-4 w-4" />
                {t('common.more', 'More')}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[220px] p-1.5 max-h-[80vh] overflow-y-auto shadow-2xl border-primary/20">
               <div className="px-2 py-1.5 mb-1 border-b border-border/40">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Extended Modules</p>
               </div>
               {moreItems.map((item) => (
                  <DropdownMenuItem key={item.path} asChild>
                     <Link to={item.path} className={cn(
                        "flex items-center gap-2.5 py-2.5 px-3 cursor-pointer rounded-md transition-colors",
                        isItemActive(item.path)
                           ? "bg-primary text-primary-foreground"
                           : "hover:bg-primary/5 text-foreground"
                     )}>
                        <item.icon className={cn("h-4 w-4", isItemActive(item.path) ? "text-white" : "text-primary")} />
                        <span className="font-semibold text-xs">{t(`nav.${item.label.toLowerCase().replace(/[^a-z0-9]/g, '_')}`, item.label)}</span>
                     </Link>
                  </DropdownMenuItem>
               ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </motion.div>
  );
}
