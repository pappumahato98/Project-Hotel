import { Link, useLocation, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  ChevronLeft, ChevronRight, Hotel, LogOut, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSidebar } from "@/hooks/use-sidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useUIPreferences, useUserRolesPermissions } from "@/hooks/useSettings";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  navItems,
  operationsNavItems,
  adminNavItems,
  NavItemConfig,
  NavSubItem
} from "@/config/navigation";

function NavItem({
  item,
  isActive,
  collapsed,
  isMobile,
  onNavClick,
  dropdownsEnabled
}: {
  item: NavItemConfig;
  isActive: boolean;
  collapsed: boolean;
  isMobile: boolean;
  onNavClick?: () => void;
  dropdownsEnabled: boolean;
}) {
  const { t } = useTranslation();
  const { openGroups, toggleGroup, setOpenGroups } = useSidebar();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isExpanded = openGroups.includes(item.label);
  const hasSubItems = item.subItems && item.subItems.length > 0 && dropdownsEnabled;

  const translationKey = `nav.${item.label.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  const translatedLabel = t(translationKey, item.label);

  const isSubActive = (sub: NavSubItem, defaultTab?: string) => {
    if (sub.path) {
      // If the sub-item has a path, check if it matches the current pathname
      // But also handle the case where the main item is active but we're on a sub-path
      return location.pathname === sub.path;
    }
    // If it's a tab, check if the main path matches and the tab param matches
    // Or if there is no tab param and this is the default tab
    const currentTab = searchParams.get("tab") || defaultTab;
    return isActive && currentTab === sub.tab;
  };

  const handleSubItemClick = (e: React.MouseEvent, sub: NavSubItem) => {
    if (sub.path) {
      // If it's a direct path, let the Link handle it
      if (onNavClick) onNavClick();
      return;
    }

    if (isActive && sub.tab) {
      e.preventDefault();
      setSearchParams(prev => {
        prev.set("tab", sub.tab!);
        return prev;
      });
    }
    if (onNavClick) onNavClick();
  };

  const link = (
    <div className="flex flex-col w-full">
      <div className={cn(
        "flex items-center w-full group rounded-lg transition-all duration-200",
        isActive
          ? "bg-sidebar-accent text-primary"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-foreground"
      )}>
        <Link
          to={item.path}
          onClick={(e) => {
            if (onNavClick) onNavClick();
          }}
          className={cn(
            "flex-1 flex items-center gap-3 px-3 py-2 text-[13px] font-medium transition-all duration-200 relative",
            collapsed && !isMobile && "justify-center px-2"
          )}
        >
          {isActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-primary" />
          )}
          <item.icon className={cn("h-[18px] w-[18px] flex-shrink-0", isActive && "text-primary")} />
          {(!collapsed || isMobile) && <span className="truncate">{translatedLabel}</span>}
        </Link>

        {hasSubItems && !collapsed && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleGroup(item.label);
            }}
            className={cn(
              "px-2 py-2 transition-colors",
              isActive ? "text-primary" : "text-sidebar-foreground/40"
            )}
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isExpanded && "rotate-180")} />
          </button>
        )}
      </div>

      {hasSubItems && isExpanded && !collapsed && (
        <div className="ml-9 mt-1 flex flex-col gap-0.5 border-l border-sidebar-border/40 pl-2">
          {item.subItems?.map((sub) => (
            <Link
              key={sub.path || sub.tab}
              to={sub.path || `${item.path}?tab=${sub.tab}`}
              onClick={(e) => handleSubItemClick(e, sub)}
              className={cn(
                "px-3 py-1.5 text-xs rounded-md transition-colors font-bold",
                isSubActive(sub, item.defaultTab)
                  ? "text-primary bg-sidebar-accent/50"
                  : "text-sidebar-foreground/60 hover:text-foreground hover:bg-sidebar-accent/30"
              )}
            >
              {sub.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );

  if (collapsed && !isMobile) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Link
            to={item.path}
            className={cn(
              "flex items-center justify-center rounded-lg h-9 w-9 transition-all duration-200 relative",
              isActive
                ? "bg-sidebar-accent text-primary"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-foreground"
            )}
          >
            {isActive && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-primary" />
            )}
            <item.icon className={cn("h-[18px] w-[18px] flex-shrink-0", isActive && "text-primary")} />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8} className="text-xs">
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  const { collapsed, toggleCollapsed, isMobile } = useSidebar();
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { data: uiPrefs } = useUIPreferences();
  const { data: perms } = useUserRolesPermissions();
  const dropdownsEnabled = uiPrefs?.sidebar_dropdowns_enabled ?? true;
  const navStyle = uiPrefs?.navigation_style || "default";

  const filterNavItems = (items: NavItemConfig[]) => {
    if (!perms?.modules) return items;
    return items.filter(item => {
      const m = perms.modules[item.label];
      // If module is explicitly disabled in permissions, hide it
      if (m?.enabled === false || m?.view === false) return false;
      return true;
    });
  };
  const isVerticalIcon = navStyle === "vertical-icon" && !isMobile;
  const effectiveCollapsed = collapsed || isVerticalIcon;

  const getInitials = () => {
    const first = profile?.first_name || "";
    const last = profile?.last_name || "";
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || "U";
  };

  const isItemActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col">
      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-0.5 p-2 overflow-y-auto scrollbar-hide">
        {filterNavItems(navItems).map((item) => (
          <NavItem
            key={item.path}
            item={item}
            isActive={isItemActive(item.path)}
            collapsed={effectiveCollapsed}
            isMobile={isMobile}
            onNavClick={onNavClick}
            dropdownsEnabled={dropdownsEnabled}
          />
        ))}

        {/* Operations Section */}
        {filterNavItems(operationsNavItems).length > 0 && (
          <>
            {(!effectiveCollapsed || isMobile) && (
              <div className="mt-4 mb-1 px-3">
                <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
                  {t('common.operations', 'Operations')}
                </p>
              </div>
            )}
            {effectiveCollapsed && !isMobile && <div className="mt-3 mb-1 mx-2 border-t border-sidebar-border/40" />}
            {filterNavItems(operationsNavItems).map((item) => (
              <NavItem
                key={item.path}
                item={item}
                isActive={isItemActive(item.path)}
                collapsed={effectiveCollapsed}
                isMobile={isMobile}
                onNavClick={onNavClick}
                dropdownsEnabled={dropdownsEnabled}
              />
            ))}
          </>
        )}
        
        {/* Admin Section */}
        {isAdmin && filterNavItems(adminNavItems).length > 0 && (
          <>
            {(!effectiveCollapsed || isMobile) && (
              <div className="mt-4 mb-1 px-3">
                <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
                  {t('common.admin', 'Admin')}
                </p>
              </div>
            )}
            {effectiveCollapsed && !isMobile && <div className="mt-3 mb-1 mx-2 border-t border-sidebar-border/40" />}
            {filterNavItems(adminNavItems).map((item) => (
              <NavItem
                key={item.path}
                item={item}
                isActive={isItemActive(item.path)}
                collapsed={effectiveCollapsed}
                isMobile={isMobile}
                onNavClick={onNavClick}
                dropdownsEnabled={dropdownsEnabled}
              />
            ))}
          </>
        )}
      </nav>

      {/* User Section */}
      {(!effectiveCollapsed || isMobile) && (
        <div className="p-3 border-t border-sidebar-border/60 mt-auto">
          <Link to="/staff?tab=details" onClick={onNavClick} className="flex items-center gap-2.5 mb-2 hover:opacity-80 transition-opacity">
            <Avatar className="h-8 w-8 ring-2 ring-primary/10">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="bg-gradient-blue text-primary-foreground text-xs font-semibold">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {profile?.first_name || "User"} {profile?.last_name || ""}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">Staff Member</p>
            </div>
          </Link>
        </div>
      )}

      {/* Collapsed User Avatar */}
      {effectiveCollapsed && !isMobile && (
        <div className="p-2 border-t border-sidebar-border/60 mt-auto flex flex-col items-center gap-1.5">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Link to="/staff?tab=details" className="hover:opacity-80 transition-opacity block">
                <Avatar className="h-8 w-8 ring-2 ring-primary/10">
                  <AvatarImage src={profile?.avatar_url || ""} />
                  <AvatarFallback className="bg-gradient-blue text-primary-foreground text-xs font-semibold">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8} className="text-xs">Profile</TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const { collapsed, isMobile, mobileOpen, setMobileOpen } = useSidebar();
  const { data: uiPrefs } = useUIPreferences();
  const navStyle = uiPrefs?.navigation_style || "default";
  const [isHovered, setIsHovered] = useState(false);

  const isHorizontal = navStyle === "horizontal-subheader" && !isMobile;

  if (isMobile) {
    return (
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0 bg-gradient-sidebar border-sidebar-border">
          <SidebarContent onNavClick={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    );
  }

  if (isHorizontal) return null;

  const isHiddenHover = navStyle === "hidden-hover" && !isMobile;
  const isVerticalIcon = navStyle === "vertical-icon" && !isMobile;

  return (
    <>
      {isHiddenHover && (
        <div
          className="fixed left-0 top-0 z-50 w-2 h-screen cursor-pointer"
          onMouseEnter={() => setIsHovered(true)}
        />
      )}
      <aside
        onMouseLeave={() => isHiddenHover && setIsHovered(false)}
        className={cn(
          "fixed left-0 top-14 z-40 h-[calc(100vh-3.5rem)] bg-gradient-sidebar border-r border-sidebar-border/60 transition-all duration-300 overflow-hidden shadow-xl",
          isVerticalIcon ? "w-[70px]" : collapsed ? "w-20" : "w-64",
          isHiddenHover && (isHovered ? "w-64 translate-x-0" : "w-64 -translate-x-full")
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
