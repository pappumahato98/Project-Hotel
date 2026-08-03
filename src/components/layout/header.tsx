'use client'

import * as React from 'react'
import { apiFetch } from '@/lib/api'
import { useTheme } from 'next-themes'
import {
  Search, User, Building2,
  Sun, Moon, LogOut, Settings,
  HelpCircle, Check, Clock,
  Shield, Mail, Phone, MapPin, Calendar,
  Globe, ChevronRight,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { useNavigationStore, useAuthStore, usePropertyStore, useSettingsStore, usePreferencesStore } from '@/lib/store'
import { DualCalendarDisplay } from '@/components/shared/dual-calendar'
import { NotificationBell } from '@/components/shared/notification-bell'
import { NAV_ITEMS, getSubModuleLabel, getDefaultSubModule } from '@/lib/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { toast } from 'sonner'

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
                {item.icon && <item.icon className="mr-2 size-4 text-muted-foreground" />}
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

// ─── Profile Dialog ─────────────────────────────────────────────────
function ProfileDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user, updateUser } = useAuthStore()
  const { settings } = useSettingsStore()
  const [firstName, setFirstName] = React.useState(user?.firstName ?? '')
  const [lastName, setLastName] = React.useState(user?.lastName ?? '')
  const [phone, setPhone] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setFirstName(user?.firstName ?? '')
      setLastName(user?.lastName ?? '')
    }
  }, [open, user])

  const handleSave = async () => {
    setSaving(true)
    try {
      // Persist to backend first
      await apiFetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName }),
      })
      updateUser({ firstName, lastName })
      toast.success('Profile updated successfully')
      onOpenChange(false)
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const initials = user ? `${(user.firstName || '').charAt(0)}${(user.lastName || '').charAt(0)}` : '??'

  const roleColorMap: Record<string, string> = {
    admin: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    gm: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    manager: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    supervisor: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
    staff: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  }

  const roleBadgeColor = roleColorMap[user?.role ?? 'staff'] ?? roleColorMap.staff

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>My Profile</DialogTitle>
          <DialogDescription>View and manage your account information.</DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {/* Avatar & Role */}
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarImage src={user?.avatarUrl || "/avatar-3d.png"} alt="User" />
              <AvatarFallback className="bg-amber-100 text-amber-700 text-lg font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-lg font-semibold">{user?.firstName} {user?.lastName}</p>
                <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 border-0', roleBadgeColor)}>
                  {user?.role?.toUpperCase()}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{user?.position} — {user?.department}</p>
            </div>
          </div>

          <Separator />

          {/* Info Fields */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium">{user?.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Shield className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">Role:</span>
              <span className="font-medium capitalize">{user?.role}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Building2 className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">Department:</span>
              <span className="font-medium">{user?.department}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">Property:</span>
              <span className="font-medium">{settings.hotelName}</span>
            </div>
          </div>

          <Separator />

          {/* Editable Fields */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Edit Profile</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="profile-first" className="text-xs">First Name</Label>
                <Input
                  id="profile-first"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-last" className="text-xs">Last Name</Label>
                <Input
                  id="profile-last"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || (!firstName.trim() || !lastName.trim())}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── My Shift Dialog ────────────────────────────────────────────────
function ShiftDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user } = useAuthStore()
  const { settings } = useSettingsStore()
  const now = new Date()
  const hour = now.getHours()
  const shiftType = hour < 14 ? 'Morning Shift' : hour < 22 ? 'Evening Shift' : 'Night Shift'
  const shiftTime = hour < 14 ? '06:00 — 14:00' : hour < 22 ? '14:00 — 22:00' : '22:00 — 06:00'
  const shiftStatus = hour < 6 || hour >= 22 ? 'Not Started' : 'In Progress'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>My Shift</DialogTitle>
          <DialogDescription>Current shift information.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
            <div className={cn(
              'flex size-10 items-center justify-center rounded-full',
              shiftStatus === 'In Progress' ? 'bg-emerald-100 dark:bg-emerald-900' : 'bg-gray-100 dark:bg-gray-800'
            )}>
              <Clock className={cn(
                'size-5',
                shiftStatus === 'In Progress' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500'
              )} />
            </div>
            <div>
              <p className="font-semibold">{shiftType}</p>
              <p className="text-xs text-muted-foreground">{shiftTime}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={shiftStatus === 'In Progress' ? 'default' : 'secondary'} className="text-xs">
                {shiftStatus}
              </Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Staff</span>
              <span className="font-medium">{user?.firstName} {user?.lastName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Department</span>
              <span className="font-medium">{user?.department}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Position</span>
              <span className="font-medium">{user?.position}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Property</span>
              <span className="font-medium">{settings.hotelName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium">{now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Help Dialog ─────────────────────────────────────────────────────
function HelpDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { navigateTo } = useNavigationStore()

  const helpItems = [
    { title: 'Getting Started Guide', desc: 'Learn the basics of the PMS system', nav: 'getting-started' as const },
    { title: 'Keyboard Shortcuts', desc: '⌘K — Quick Search, ⌘B — Toggle Sidebar', nav: 'shortcuts' as const },
    { title: 'User Manual', desc: 'Complete reference documentation', nav: 'manual' as const },
    { title: 'FAQ', desc: 'Frequently asked questions', nav: 'faq' as const },
    { title: 'Contact IT Support', desc: 'ext. 1000 or it@meridian.com', nav: 'contact' as const },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Help & Support</DialogTitle>
          <DialogDescription>Resources and support contacts.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {helpItems.map((item) => (
            <button
              key={item.title}
              className="flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
              onClick={() => {
                onOpenChange(false)
                navigateTo('help', item.nav)
              }}
            >
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
          ))}
        </div>
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 dark:bg-amber-950/50 dark:border-amber-800">
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1">System Version</p>
          <p className="text-xs text-amber-700 dark:text-amber-400">Meridian PMS v2.0.0 — Build 2024.01</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); navigateTo('help') }}>Open Full Help Center</Button>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── User Menu ──────────────────────────────────────────────────────
function UserMenu() {
  const { setTheme, resolvedTheme } = useTheme()
  const { user, logout } = useAuthStore()
  const { activeProperty, properties, setActiveProperty } = usePropertyStore()
  const { navigateTo } = useNavigationStore()
  const [mounted, setMounted] = React.useState(false)
  const [profileOpen, setProfileOpen] = React.useState(false)
  const [shiftOpen, setShiftOpen] = React.useState(false)
  const [helpOpen, setHelpOpen] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  const initials = user
    ? `${(user.firstName || '').charAt(0)}${(user.lastName || '').charAt(0)}`
    : '??'

  const displayName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User' : 'Unknown User'
  const displayRole = user?.position || 'Staff'
  const displayDept = user?.department || 'Management'

  const roleColorMap: Record<string, string> = {
    admin: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    gm: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    manager: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    supervisor: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
    staff: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  }

  const roleBadgeColor = roleColorMap[user?.role ?? 'staff'] ?? roleColorMap.staff

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
    } catch {
      // Logout endpoint unreachable — clear local state anyway
    }
    logout()
    toast.success('Signed out successfully')
  }

  const handlePropertySwitch = (propertyId: string) => {
    const property = properties.find((p) => p.id === propertyId)
    if (property) {
      setActiveProperty(property)
      toast.success(`Switched to ${property.name}`)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="relative h-8 gap-2 rounded-full pl-2 pr-3">
            <Avatar className="size-7">
              <AvatarImage src={user?.avatarUrl || "/avatar-3d.png"} alt="User" />
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
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer">
              <Building2 className="mr-2 size-4 text-amber-600" />
              <span>Switch Property</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {properties.map((property) => (
                <DropdownMenuItem
                  key={property.id}
                  className="cursor-pointer"
                  onClick={() => handlePropertySwitch(property.id)}
                >
                  <Building2 className="mr-2 size-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="text-sm">{property.name}</span>
                    <span className="text-[10px] text-muted-foreground">{property.city}</span>
                  </div>
                  {activeProperty.id === property.id && (
                    <Check className="ml-auto size-4 text-amber-600" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          {/* Account Section */}
          <DropdownMenuGroup>
            <DropdownMenuItem className="cursor-pointer" onSelect={() => setProfileOpen(true)}>
              <User className="mr-2 size-4" />
              My Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onSelect={() => navigateTo('settings')}>
              <Settings className="mr-2 size-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onSelect={() => setShiftOpen(true)}>
              <Clock className="mr-2 size-4" />
              My Shift
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() => navigateTo('hr', 'employees')}
            >
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
            <DropdownMenuItem className="cursor-pointer" onSelect={() => setHelpOpen(true)}>
              <HelpCircle className="mr-2 size-4" />
              Help & Support
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          {/* Sign Out */}
          <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600" onSelect={handleLogout}>
            <LogOut className="mr-2 size-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialogs */}
      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
      <ShiftDialog open={shiftOpen} onOpenChange={setShiftOpen} />
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  )
}

// ─── Page Breadcrumb ──────────────────────────────────────────────
function PageBreadcrumb({ activeModule, activeSubModule }: { activeModule: string; activeSubModule: string | null }) {
  const navigateTo = useNavigationStore((s) => s.navigateTo)
  const navItem = NAV_ITEMS.find(n => n.id === activeModule)

  if (!navItem) return null

  const hasChildren = navItem.children && navItem.children.length > 0
  const subLabel = activeSubModule ? getSubModuleLabel(activeModule, activeSubModule) : null

  // Clicking the module name navigates to its default sub-module (or just the module for no-children items)
  const handleModuleClick = () => {
    if (hasChildren) {
      const defaultSub = getDefaultSubModule(activeModule)
      if (defaultSub && activeSubModule !== defaultSub) {
        navigateTo(activeModule, defaultSub)
      }
    }
  }

  // For items with children, clicking the sub-module name could navigate to the parent
  // But since the sub-module IS the current page, we leave it as display-only text

  return (
    <nav aria-label="Page breadcrumb" className="flex items-center gap-1.5 text-sm min-w-0">
      {navItem.icon && <navItem.icon className={cn('size-4 shrink-0', navItem.color)} />}
      {hasChildren && subLabel ? (
        <>
          <button
            type="button"
            onClick={handleModuleClick}
            className={cn(
              'font-semibold truncate hover:underline underline-offset-2 transition-colors',
              navItem.color,
              activeSubModule !== getDefaultSubModule(activeModule) ? 'cursor-pointer' : 'cursor-default'
            )}
            tabIndex={activeSubModule !== getDefaultSubModule(activeModule) ? 0 : -1}
            disabled={activeSubModule === getDefaultSubModule(activeModule)}
          >
            {navItem.label}
          </button>
          <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
          <span className="text-foreground font-medium truncate">
            {subLabel}
          </span>
        </>
      ) : (
        <span className={cn('font-semibold truncate', navItem.color)}>
          {navItem.label}
        </span>
      )}
    </nav>
  )
}

// ─── AppHeader ────────────────────────────────────────────────────────
export function AppHeader() {
  const { setSearchOpen, activeModule, activeSubModule } = useNavigationStore()
  const { activeProperty } = usePropertyStore()
  const { preferences } = usePreferencesStore()
  const { user } = useAuthStore()
  const showDualCalendar = preferences.nepaliStandards?.dualCalendar !== false
  // Hide search button on calendar page to maximize space
  const isCalendarPage = activeModule === 'front-desk' && activeSubModule === 'calendar'

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6">
        {/* Page Name / Breadcrumb Navigation */}
        <PageBreadcrumb activeModule={activeModule} activeSubModule={activeSubModule} />

        {/* Dual Calendar Date (hidden on small screens) */}
        {showDualCalendar && (
          <>
            <Separator orientation="vertical" className="hidden lg:block h-4" />
            <div className="hidden lg:block">
              <DualCalendarDisplay
                date={new Date()}
                variant="compact"
                showAD
                showBS
                showHoliday
              />
            </div>
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search button (hidden on calendar page) */}
        {!isCalendarPage && (
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
        )}
        {/* Mobile search (hidden on calendar page) */}
        {!isCalendarPage && (
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden size-8"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="size-4" />
            <span className="sr-only">Search</span>
          </Button>
        )}

        {/* Realtime Notifications */}
        <NotificationBell />

        {/* User menu */}
        <UserMenu key={user?.firstName + '|' + user?.lastName + '|' + (user?.avatarUrl || '').slice(0, 30)} />
      </header>

      {/* Quick search dialog */}
      <QuickSearchDialog />
    </>
  )
}
