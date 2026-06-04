'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import {
  Building2, ChevronRight, Settings, Sun, Moon, LogOut, Star,
  LayoutDashboard, User, Shield,
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
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

// ─── User Profile Footer ─────────────────────────────────────────────
function UserProfileFooter() {
  const { user, logout } = useAuthStore()
  const { setTheme, resolvedTheme } = useTheme()
  const { setActiveModule } = useNavigationStore()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  const initials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`
    : '??'

  const displayName = user ? `${user.firstName} ${user.lastName}` : 'Unknown User'
  const displayRole = user?.position || 'Staff'

  const handleLogout = () => {
    logout()
    toast.success('Signed out successfully')
  }

  const handleSettings = () => {
    setActiveModule('dashboard')
  }

  const handleToggleTheme = () => {
    if (mounted) setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          tooltip="User Profile"
          className="cursor-pointer gap-3 px-3 w-full"
          size="lg"
        >
          <Avatar className="size-8 rounded-full shrink-0">
            <AvatarImage src={user?.avatarUrl ?? undefined} alt="User" />
            <AvatarFallback className="bg-amber-100 text-amber-700 text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
            <span className="truncate font-semibold text-sidebar-foreground">
              {displayName}
            </span>
            <span className="truncate text-[11px] text-muted-foreground flex items-center gap-1">
              <Shield className="size-3" />
              {displayRole}
            </span>
          </div>
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="end"
        sideOffset={4}
        className="w-56"
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer gap-2" onClick={handleSettings}>
          <Settings className="size-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer gap-2" onClick={handleToggleTheme}>
          {mounted && resolvedTheme === 'dark' ? (
            <>
              <Sun className="size-4 text-amber-400" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="size-4" />
              <span>Dark Mode</span>
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer gap-2 text-red-600 focus:text-red-600" onClick={handleLogout}>
          <LogOut className="size-4" />
          <span>Log Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ─── AppSidebar ──────────────────────────────────────────────────────
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { activeProperty } = usePropertyStore()

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

      {/* Footer — User Profile */}
      <SidebarFooter className="border-t border-sidebar-border mt-auto pb-3 pt-2 gap-1">
        <SidebarMenu>
          <SidebarMenuItem>
            <UserProfileFooter />
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarRail />
      </SidebarFooter>
    </Sidebar>
  )
}
