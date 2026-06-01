'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  Search, Bell, User, Building2,
  Sun, Moon, LogOut, Settings, Clock,
  HelpCircle, Check, Star, LayoutDashboard,
  CalendarDays, BedDouble, UtensilsCrossed, ClipboardCheck,
  Users, UserCog, PartyPopper, Calculator, Package, Wrench,
  TrendingUp, Globe,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { useNavigationStore, useAuthStore } from '@/lib/store'
import { NAV_ITEMS } from '@/lib/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { SidebarTrigger } from '@/components/ui/sidebar'

// ─── Quick Search Dialog ────────────────────────────────────────────
function QuickSearchDialog() {
  const { searchOpen, setSearchOpen, navigateTo } = useNavigationStore()
  const [query, setQuery] = React.useState('')

  const filteredItems = React.useMemo(() => {
    if (!query.trim()) return NAV_ITEMS
    const lower = query.toLowerCase()
    return NAV_ITEMS.filter(
      (item) =>
        item.label.toLowerCase().includes(lower) ||
        item.children?.some((c) => c.label.toLowerCase().includes(lower))
    )
  }, [query])

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setSearchOpen(!searchOpen)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [searchOpen, setSearchOpen])

  return (
    <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
      <CommandInput
        placeholder="Search modules, pages..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {filteredItems.map((item) => (
          <React.Fragment key={item.id}>
            <CommandGroup heading={item.label}>
              <CommandItem
                onSelect={() => {
                  navigateTo(item.id)
                  setSearchOpen(false)
                  setQuery('')
                }}
              >
                <item.icon className="mr-2 size-4 text-muted-foreground" />
                <span>{item.label}</span>
              </CommandItem>
              {item.children?.map((child) => (
                <CommandItem
                  key={child.id}
                  onSelect={() => {
                    navigateTo(item.id, child.id)
                    setSearchOpen(false)
                    setQuery('')
                  }}
                  className="pl-8"
                >
                  <span>{child.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </React.Fragment>
        ))}
      </CommandList>
    </CommandDialog>
  )
}

// ─── User Menu ──────────────────────────────────────────────────────
function UserMenu() {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  const initials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`
    : '??'

  const displayName = user ? `${user.firstName} ${user.lastName}` : 'Unknown User'
  const displayRole = user?.position || 'Staff'
  const displayDept = user?.department || 'Management'

  const roleColorMap: Record<string, string> = {
    admin: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    gm: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    supervisor: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    staff: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  }

  const roleBadgeColor = roleColorMap[user?.role ?? 'staff'] ?? roleColorMap.staff

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative h-8 gap-2 rounded-full pl-2 pr-3">
          <Avatar className="size-7">
            <AvatarImage src={user?.avatarUrl ?? undefined} alt="User" />
            <AvatarFallback className="bg-amber-100 text-amber-700 text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-xs font-medium leading-none">{displayName}</span>
            <span className="text-[10px] text-muted-foreground leading-none mt-0.5">{displayRole}</span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72" align="end" forceMount>
        {/* User Info Header */}
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1.5">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium leading-none">{displayName}</p>
              <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 border-0', roleBadgeColor)}>
                {user?.role?.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {displayDept} &middot; {displayRole}
            </p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Property Switcher */}
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal py-1">
          Switch Property
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem className="cursor-pointer">
            <Building2 className="mr-2 size-4 text-amber-600" />
            Meridian Hotel
            <Check className="ml-auto size-4 text-amber-600" />
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer text-muted-foreground">
            <Building2 className="mr-2 size-4" />
            Lakeside Resort Pokhara
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer text-muted-foreground">
            <Building2 className="mr-2 size-4" />
            Himalayan View Hotel
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Account Section */}
        <DropdownMenuGroup>
          <DropdownMenuItem className="cursor-pointer">
            <User className="mr-2 size-4" />
            My Profile
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer">
            <Settings className="mr-2 size-4" />
            My Preferences
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer">
            <Clock className="mr-2 size-4" />
            My Shift
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer">
            <Building2 className="mr-2 size-4" />
            My Department
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Actions Section */}
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => mounted && setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          >
            {mounted && resolvedTheme === 'dark' ? (
              <Sun className="mr-2 size-4" />
            ) : (
              <Moon className="mr-2 size-4" />
            )}
            {mounted && resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer">
            <HelpCircle className="mr-2 size-4" />
            Help & Support
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Sign Out */}
        <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600" onClick={handleLogout}>
          <LogOut className="mr-2 size-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ─── AppHeader ────────────────────────────────────────────────────────
export function AppHeader() {
  const { setSearchOpen } = useNavigationStore()

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6">
        {/* Mobile menu toggle */}
        <SidebarTrigger className="-ml-1" />

        <Separator orientation="vertical" className="mr-2 h-4" />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search button */}
        <Button
          variant="outline"
          size="sm"
          className="hidden sm:inline-flex h-8 gap-2 text-muted-foreground w-64 justify-start font-normal"
          onClick={() => setSearchOpen(true)}
        >
          <Search className="size-3.5" />
          <span>Search...</span>
          <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">&#8984;</span>K
          </kbd>
        </Button>
        {/* Mobile search */}
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden size-8"
          onClick={() => setSearchOpen(true)}
        >
          <Search className="size-4" />
          <span className="sr-only">Search</span>
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative size-8">
              <Bell className="size-4" />
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                5
              </span>
              <span className="sr-only">Notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel className="flex items-center justify-between">
              Notifications
              <Badge variant="secondary" className="text-[10px]">5 new</Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup className="max-h-64 overflow-y-auto">
              <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className="flex h-2 w-2 rounded-full bg-blue-500" />
                  New reservation from John Smith
                </div>
                <span className="text-xs text-muted-foreground pl-4">2 minutes ago</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className="flex h-2 w-2 rounded-full bg-amber-500" />
                  Room 305 checkout reminder
                </div>
                <span className="text-xs text-muted-foreground pl-4">15 minutes ago</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className="flex h-2 w-2 rounded-full bg-green-500" />
                  Housekeeping task completed
                </div>
                <span className="text-xs text-muted-foreground pl-4">1 hour ago</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className="flex h-2 w-2 rounded-full bg-orange-500" />
                  Low stock alert: Towels
                </div>
                <span className="text-xs text-muted-foreground pl-4">2 hours ago</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className="flex h-2 w-2 rounded-full bg-purple-500" />
                  Payment received: $1,250
                </div>
                <span className="text-xs text-muted-foreground pl-4">3 hours ago</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center text-sm font-medium text-primary cursor-pointer">
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <UserMenu />
      </header>

      {/* Quick search dialog */}
      <QuickSearchDialog />
    </>
  )
}
