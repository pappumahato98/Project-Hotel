'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import {
  Building2, ChevronRight, Settings, Sun, Moon, LogOut, Star,
  LayoutDashboard,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { useNavigationStore, useAuthStore, usePropertyStore } from '@/lib/store'
import { NAV_ITEMS, type NavItem } from '@/lib/navigation'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { toast } from 'sonner'

// ─── Nav Group ──────────────────────────────────────────────────────
function NavGroup({ item }: { item: NavItem }) {
  const { activeModule, activeSubModule, expandedItems, toggleExpanded, navigateTo } =
    useNavigationStore()
  const isExpanded = expandedItems.includes(item.id)
  const isActive = activeModule === item.id

  // Items without children — simple link
  if (!item.children) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip={item.label}
          isActive={isActive}
          onClick={() => navigateTo(item.id)}
        >
          <item.icon className={cn('size-4', isActive ? item.color : 'text-muted-foreground')} />
          <span>{item.label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  // Items with children — collapsible
  return (
    <Collapsible
      open={isExpanded}
      onOpenChange={() => toggleExpanded(item.id)}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            tooltip={item.label}
            isActive={isActive}
            className={cn(
              'transition-colors',
              isActive && 'bg-sidebar-accent text-sidebar-accent-foreground'
            )}
          >
            <item.icon className={cn('size-4', isActive ? item.color : 'text-muted-foreground')} />
            <span>{item.label}</span>
            <ChevronRight
              className={cn(
                'ml-auto size-4 shrink-0 text-muted-foreground transition-transform duration-200',
                isExpanded && 'rotate-90'
              )}
            />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        {item.badge !== undefined && (
          <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
        )}
      </SidebarMenuItem>
      <CollapsibleContent className="data-[state=closed]:hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up overflow-hidden">
        <SidebarMenuSub>
          {item.children.map((child) => {
            const childActive = activeModule === item.id && activeSubModule === child.id
            return (
              <SidebarMenuSubItem key={child.id}>
                <SidebarMenuSubButton
                  isActive={childActive}
                  onClick={() => navigateTo(item.id, child.id)}
                  className={cn(
                    'transition-colors cursor-pointer',
                    childActive && 'font-medium'
                  )}
                >
                  <span
                    className={cn(
                      'absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full transition-opacity',
                      childActive ? 'opacity-100 bg-current' : 'opacity-0',
                      item.color.replace('text-', 'bg-')
                    )}
                  />
                  {child.label}
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            )
          })}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  )
}

// ─── Theme Toggle ────────────────────────────────────────────────────
function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <SidebarMenuButton className="size-8 cursor-pointer" tooltip="Toggle theme">
        <Sun className="size-4" />
      </SidebarMenuButton>
    )
  }

  return (
    <SidebarMenuButton
      className="size-8 cursor-pointer"
      tooltip="Toggle theme"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="size-4 text-amber-400" />
      ) : (
        <Moon className="size-4 text-slate-600" />
      )}
    </SidebarMenuButton>
  )
}

// ─── AppSidebar ──────────────────────────────────────────────────────
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { logout } = useAuthStore()
  const { activeProperty } = usePropertyStore()
  const { setActiveModule } = useNavigationStore()

  const handleLogout = () => {
    logout()
    toast.success('Signed out successfully')
  }

  const handleSettings = () => {
    setActiveModule('dashboard')
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      {/* Header — Property Name & Logo */}
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="hover:bg-sidebar-accent/50"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-sm">
                <Building2 className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold text-sidebar-foreground">
                  {activeProperty.name}
                </span>
                <span className="truncate text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Star className="size-2.5 fill-amber-400 text-amber-400" />
                  <Star className="size-2.5 fill-amber-400 text-amber-400" />
                  <Star className="size-2.5 fill-amber-400 text-amber-400" />
                  <Star className="size-2.5 fill-amber-400 text-amber-400" />
                  <Star className="size-2.5 fill-amber-400 text-amber-400" />
                  <span className="ml-1">Hotel</span>
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Navigation Items */}
      <SidebarContent>
        <ScrollArea className="h-full">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ITEMS.map((item) => (
                  <NavGroup key={item.id} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>

      {/* Footer — Settings, Theme, Collapse */}
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Settings" className="cursor-pointer" onClick={handleSettings}>
              <Settings className="size-4 text-muted-foreground" />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Log Out" className="cursor-pointer text-red-500 hover:text-red-600" onClick={handleLogout}>
              <LogOut className="size-4" />
              <span>Log Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarSeparator />
        <div className="flex items-center justify-between px-2">
          <ThemeToggle />
          <SidebarRail />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
