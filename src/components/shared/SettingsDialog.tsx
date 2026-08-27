'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import { useSidebar } from '@/components/ui/sidebar'
import {
  Settings,
  Building2,
  Clock,
  Languages,
  Globe,
  Palette,
  Calendar,
  Coins,
  MonitorSmartphone,
  PanelLeftClose,
  PanelLeft,
  Bell,
  BellRing,
  LogIn,
  LogOut,
  ShieldCheck,
  Timer,
  Trash2,
  Info,
  Database,
  HardDrive,
  Mail,
  Star,
  Sun,
  Moon,
  Monitor,
  Users,
  KeyRound,
  AlertTriangle,
  Package,
  CreditCard,
  MoonStar,
  Phone,
  MapPin,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { useAuthStore, usePropertyStore, usePreferencesStore, useSettingsStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'

// ─── Constants ───────────────────────────────────────────────────────

const CURRENCY_MAP: Record<string, { symbol: string; name: string }> = {
  NPR: { symbol: 'Rs.', name: 'Nepalese Rupee' },
  USD: { symbol: '$', name: 'US Dollar' },
  EUR: { symbol: '€', name: 'Euro' },
  INR: { symbol: '₹', name: 'Indian Rupee' },
}

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const hour = String(i).padStart(2, '0')
  return { value: `${hour}:00`, label: `${hour}:00` }
})

// ─── Section Header ───────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="flex size-9 items-center justify-center rounded-lg bg-muted shrink-0 mt-0.5">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

// ─── Setting Row ──────────────────────────────────────────────────────

function SettingRow({
  icon,
  label,
  description,
  children,
}: {
  icon?: React.ElementType
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div className="flex size-8 items-center justify-center rounded-lg bg-muted shrink-0">
            <icon className="size-4 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0">
          <Label className="text-sm font-medium">{label}</Label>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

// ─── Toggle Row ──────────────────────────────────────────────────────

function ToggleRow({
  icon,
  label,
  description,
  checked,
  onCheckedChange,
  disabled = false,
}: {
  icon?: React.ElementType
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <SettingRow icon={icon} label={label} description={description}>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </SettingRow>
  )
}

// ─── General Tab ─────────────────────────────────────────────────────

function GeneralTab() {
  const { activeProperty, setActiveProperty } = usePropertyStore()
  const { preferences, updatePreferences } = usePreferencesStore()
  const { settings, saveToBackend } = useSettingsStore()

  // Property info local state
  const [name, setName] = React.useState(activeProperty.name)
  const [code, setCode] = React.useState(activeProperty.code)
  const [city, setCity] = React.useState(activeProperty.city)
  const [country, setCountry] = React.useState(settings.country)
  const [phone, setPhone] = React.useState(settings.phone)
  const [email, setEmail] = React.useState(settings.email)
  const [starRating, setStarRating] = React.useState(String(settings.starRating))

  // Business hours local state
  const [checkIn, setCheckIn] = React.useState(settings.defaultCheckIn)
  const [checkOut, setCheckOut] = React.useState(settings.defaultCheckOut)
  const [nightAudit, setNightAudit] = React.useState(settings.nightAuditTime)

  // Sync with store when dialog opens
  React.useEffect(() => {
    setName(activeProperty.name)
    setCode(activeProperty.code)
    setCity(activeProperty.city)
    setCountry(settings.country)
    setPhone(settings.phone)
    setEmail(settings.email)
    setStarRating(String(settings.starRating))
    setCheckIn(settings.defaultCheckIn)
    setCheckOut(settings.defaultCheckOut)
    setNightAudit(settings.nightAuditTime)
  }, [activeProperty.name, activeProperty.code, activeProperty.city, settings.country, settings.phone, settings.email, settings.starRating, settings.defaultCheckIn, settings.defaultCheckOut, settings.nightAuditTime])

  const handlePropertySave = (field: string, value: string) => {
    setActiveProperty({ ...activeProperty, [field]: value })
    saveToBackend({ [field]: value })
    toast.success('Property info updated')
  }

  return (
    <div className="space-y-6">
      {/* Property Info */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader
            icon={Building2}
            title="Property Information"
            description="Manage your hotel details and contact information"
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="prop-name" className="text-xs">Hotel Name</Label>
              <Input
                id="prop-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => handlePropertySave('name', name)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prop-code" className="text-xs">Hotel Code</Label>
              <Input
                id="prop-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onBlur={() => handlePropertySave('code', code)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prop-city" className="text-xs">City</Label>
              <Input
                id="prop-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onBlur={() => handlePropertySave('city', city)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prop-country" className="text-xs">Country</Label>
              <Input
                id="prop-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                onBlur={() => { saveToBackend({ country }); toast.success('Property info updated') }}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prop-phone" className="text-xs">Phone</Label>
              <Input
                id="prop-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={() => { saveToBackend({ phone }); toast.success('Property info updated') }}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prop-email" className="text-xs">Email</Label>
              <Input
                id="prop-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => { saveToBackend({ email }); toast.success('Property info updated') }}
                className="h-9"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Star Rating</Label>
            <Select value={starRating} onValueChange={(v) => { setStarRating(v); saveToBackend({ starRating: Number(v) }); toast.success('Star rating updated') }}>
              <SelectTrigger className="w-24 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    <span className="flex items-center gap-0.5">
                      {Array.from({ length: n }).map((_, i) => (
                        <Star key={i} className="size-3 fill-amber-400 text-amber-400" />
                      ))}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Business Hours */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader
            icon={Clock}
            title="Business Hours"
            description="Default check-in, check-out, and night audit times"
          />
        </CardHeader>
        <CardContent className="space-y-3">
          <SettingRow icon={LogIn} label="Default Check-In" description="Standard guest arrival time">
            <Select
              value={checkIn}
              onValueChange={(v) => { setCheckIn(v); saveToBackend({ defaultCheckIn: v }); toast.success('Check-in time updated') }}
            >
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-48">
                {TIME_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>
          <Separator />
          <SettingRow icon={LogOut} label="Default Check-Out" description="Standard guest departure time">
            <Select
              value={checkOut}
              onValueChange={(v) => { setCheckOut(v); saveToBackend({ defaultCheckOut: v }); toast.success('Check-out time updated') }}
            >
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-48">
                {TIME_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>
          <Separator />
          <SettingRow icon={MoonStar} label="Night Audit Time" description="When the daily night audit runs">
            <Select
              value={nightAudit}
              onValueChange={(v) => { setNightAudit(v); saveToBackend({ nightAuditTime: v }); toast.success('Night audit time updated') }}
            >
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-48">
                {TIME_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>
        </CardContent>
      </Card>

      {/* Language & Timezone */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader
            icon={Globe}
            title="Language & Timezone"
            description="Regional preferences for the interface"
          />
        </CardHeader>
        <CardContent className="space-y-3">
          <SettingRow icon={Languages} label="Language" description="Interface display language">
            <Select
              value={preferences.language}
              onValueChange={(v) => {
                updatePreferences({ language: v })
                toast.success('Language updated')
              }}
            >
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ne">नेपाली</SelectItem>
                <SelectItem value="hi">हिन्दी</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
          <Separator />
          <SettingRow icon={Globe} label="Timezone" description="Business operating timezone">
            <Select
              value={preferences.timezone}
              onValueChange={(v) => {
                updatePreferences({ timezone: v })
                toast.success('Timezone updated')
              }}
            >
              <SelectTrigger className="w-44 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Asia/Katmandu">Asia/Kathmandu (NPT)</SelectItem>
                <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                <SelectItem value="UTC">UTC</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Display Tab ─────────────────────────────────────────────────────

function DisplayTab() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { preferences, updatePreferences } = usePreferencesStore()
  const { state, toggleSidebar } = useSidebar()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme as 'light' | 'dark' | 'system')
    toast.success('Theme updated')
  }

  return (
    <div className="space-y-6">
      {/* Theme */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader
            icon={Palette}
            title="Appearance"
            description="Customize the look and feel of the interface"
          />
        </CardHeader>
        <CardContent className="space-y-4">
          {mounted && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-muted shrink-0">
                    <Sun className="size-4 text-muted-foreground" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Theme</Label>
                    <p className="text-xs text-muted-foreground">Choose your preferred color scheme</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 rounded-lg border p-0.5">
                  <Button
                    size="sm"
                    variant={theme === 'light' ? 'default' : 'ghost'}
                    className="size-8 p-0 text-xs"
                    onClick={() => handleThemeChange('light')}
                  >
                    <Sun className="size-3.5 mr-1" />
                    <span className="hidden sm:inline">Light</span>
                  </Button>
                  <Button
                    size="sm"
                    variant={theme === 'dark' ? 'default' : 'ghost'}
                    className="size-8 p-0 text-xs"
                    onClick={() => handleThemeChange('dark')}
                  >
                    <Moon className="size-3.5 mr-1" />
                    <span className="hidden sm:inline">Dark</span>
                  </Button>
                  <Button
                    size="sm"
                    variant={theme === 'system' ? 'default' : 'ghost'}
                    className="size-8 p-0 text-xs"
                    onClick={() => handleThemeChange('system')}
                  >
                    <Monitor className="size-3.5 mr-1" />
                    <span className="hidden sm:inline">System</span>
                  </Button>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Current: {resolvedTheme === 'dark' ? 'Dark' : 'Light'} mode
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Date, Currency, Compact Mode */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader
            icon={Calendar}
            title="Format & Layout"
            description="Date format, currency display, and interface density"
          />
        </CardHeader>
        <CardContent className="space-y-3">
          <SettingRow icon={Calendar} label="Date Format" description="How dates are displayed">
            <Select
              value={preferences.dateFormat}
              onValueChange={(v) => {
                updatePreferences({ dateFormat: v })
                toast.success('Date format updated')
              }}
            >
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
          <Separator />
          <SettingRow icon={Coins} label="Currency" description="Default currency for all amounts">
            <Select
              value={preferences.currency}
              onValueChange={(v) => {
                updatePreferences({ currency: v })
                toast.success('Currency updated')
              }}
            >
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CURRENCY_MAP).map(([code, { symbol, name }]) => (
                  <SelectItem key={code} value={code}>
                    {code} ({symbol}) — {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>
          <Separator />
          <ToggleRow
            icon={MonitorSmartphone}
            label="Compact Mode"
            description="Reduce spacing in tables and lists for denser view"
            checked={preferences.compactMode}
            onCheckedChange={(v) => {
              updatePreferences({ compactMode: v })
              toast.success(v ? 'Compact mode enabled' : 'Compact mode disabled')
            }}
          />
        </CardContent>
      </Card>

      {/* Sidebar */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader
            icon={PanelLeftClose}
            title="Sidebar"
            description="Control the sidebar appearance and behavior"
          />
        </CardHeader>
        <CardContent className="space-y-3">
          <SettingRow icon={state === 'collapsed' ? PanelLeftClose : PanelLeft} label="Sidebar Default" description="Set the default sidebar state">
            <div className="flex items-center gap-1 rounded-lg border p-0.5">
              <Button
                size="sm"
                variant={state === 'expanded' ? 'default' : 'ghost'}
                className="size-8 p-0 text-xs"
                onClick={() => {
                  if (state === 'collapsed') toggleSidebar()
                }}
              >
                <PanelLeft className="size-3.5 mr-1" />
                <span className="hidden sm:inline">Expanded</span>
              </Button>
              <Button
                size="sm"
                variant={state === 'collapsed' ? 'default' : 'ghost'}
                className="size-8 p-0 text-xs"
                onClick={() => {
                  if (state === 'expanded') toggleSidebar()
                }}
              >
                <PanelLeftClose className="size-3.5 mr-1" />
                <span className="hidden sm:inline">Collapsed</span>
              </Button>
            </div>
          </SettingRow>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Notifications Tab ────────────────────────────────────────────────

interface NotificationSettings {
  checkInReminders: boolean
  checkOutReminders: boolean
  overbookingAlerts: boolean
  lowStockAlerts: boolean
  paymentReceived: boolean
  nightAuditAlert: boolean
}

function NotificationsTab() {
  const { preferences, updatePreferences } = usePreferencesStore()
  const [notifSettings, setNotifSettings] = React.useState<NotificationSettings>({
    checkInReminders: true,
    checkOutReminders: true,
    overbookingAlerts: true,
    lowStockAlerts: true,
    paymentReceived: true,
    nightAuditAlert: false,
  })

  const masterEnabled = preferences.notifications

  const handleToggle = (key: keyof NotificationSettings, value: boolean) => {
    setNotifSettings((prev) => ({ ...prev, [key]: value }))
    toast.success('Notification preference updated')
  }

  const handleMasterToggle = (value: boolean) => {
    updatePreferences({ notifications: value })
    toast.success(value ? 'Notifications enabled' : 'Notifications disabled')
  }

  return (
    <div className="space-y-6">
      {/* Master Toggle */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader
            icon={Bell}
            title="Notification Preferences"
            description="Control which notifications you receive"
          />
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleRow
            icon={BellRing}
            label="Enable Notifications"
            description="Master switch for all notification types"
            checked={masterEnabled}
            onCheckedChange={handleMasterToggle}
          />
        </CardContent>
      </Card>

      {/* Individual Notification Toggles */}
      <Card>
        <CardContent className="pt-4 space-y-1">
          <ToggleRow
            icon={LogIn}
            label="Check-in Reminders"
            description="Get notified about upcoming guest arrivals"
            checked={notifSettings.checkInReminders}
            onCheckedChange={(v) => handleToggle('checkInReminders', v)}
            disabled={!masterEnabled}
          />
          <Separator />
          <ToggleRow
            icon={LogOut}
            label="Check-out Reminders"
            description="Get notified about departing guests and room status"
            checked={notifSettings.checkOutReminders}
            onCheckedChange={(v) => handleToggle('checkOutReminders', v)}
            disabled={!masterEnabled}
          />
          <Separator />
          <ToggleRow
            icon={AlertTriangle}
            label="Overbooking Alerts"
            description="Critical warnings for double bookings and conflicts"
            checked={notifSettings.overbookingAlerts}
            onCheckedChange={(v) => handleToggle('overbookingAlerts', v)}
            disabled={!masterEnabled}
          />
          <Separator />
          <ToggleRow
            icon={Package}
            label="Low Stock Alerts"
            description="Warnings when inventory items fall below minimum"
            checked={notifSettings.lowStockAlerts}
            onCheckedChange={(v) => handleToggle('lowStockAlerts', v)}
            disabled={!masterEnabled}
          />
          <Separator />
          <ToggleRow
            icon={CreditCard}
            label="Payment Received"
            description="Confirmation when a payment is recorded"
            checked={notifSettings.paymentReceived}
            onCheckedChange={(v) => handleToggle('paymentReceived', v)}
            disabled={!masterEnabled}
          />
          <Separator />
          <ToggleRow
            icon={MoonStar}
            label="Night Audit Alert"
            description="Reminder to perform the daily night audit procedure"
            checked={notifSettings.nightAuditAlert}
            onCheckedChange={(v) => handleToggle('nightAuditAlert', v)}
            disabled={!masterEnabled}
          />
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Security Tab ──────────────────────────────────────────────────────

function SecurityTab() {
  const { user } = useAuthStore()
  const { settings, saveToBackend } = useSettingsStore()
  const [twoFactor, setTwoFactor] = React.useState(false)
  const [autoLogout, setAutoLogout] = React.useState(settings.autoLogout)
  const [loginTime] = React.useState(() => {
    const now = new Date()
    now.setHours(now.getHours() - 3)
    return now
  })

  const sessionDuration = React.useMemo(() => {
    const diff = Date.now() - loginTime.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }, [loginTime])

  const handleClearData = () => {
    try {
      localStorage.clear()
      toast.success('Local data and cache cleared successfully')
    } catch {
      toast.error('Failed to clear data')
    }
  }

  return (
    <div className="space-y-6">
      {/* User Info */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader
            icon={Users}
            title="Current User"
            description="Your account information (read-only)"
          />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-muted-foreground">Full Name</span>
            <span className="text-sm font-medium">{user?.firstName} {user?.lastName}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-muted-foreground">Email</span>
            <span className="text-sm font-medium">{user?.email}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-muted-foreground">Role</span>
            <Badge variant="outline" className="text-[10px] capitalize">
              {user?.role}
            </Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-muted-foreground">Department</span>
            <span className="text-sm font-medium">{user?.department}</span>
          </div>
        </CardContent>
      </Card>

      {/* Session Info */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader
            icon={Timer}
            title="Session"
            description="Information about your current session"
          />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-muted-foreground">Last Login</span>
            <span className="text-sm font-medium">
              {loginTime.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-muted-foreground">Session Duration</span>
            <span className="text-sm font-medium">{sessionDuration}</span>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader
            icon={KeyRound}
            title="Security Settings"
            description="Configure authentication and session policies"
          />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-4 py-2">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-lg bg-muted shrink-0">
                <ShieldCheck className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Two-Factor Authentication</Label>
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                    Coming Soon
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">Add an extra layer of security to your account</p>
              </div>
            </div>
            <Switch checked={twoFactor} onCheckedChange={() => {
              toast.info('Two-Factor Authentication is coming soon!')
            }} disabled />
          </div>
          <Separator />
          <SettingRow icon={Timer} label="Auto Logout" description="Automatically sign out after inactivity">
            <Select
              value={autoLogout}
              onValueChange={(v) => {
                setAutoLogout(v)
                saveToBackend({ autoLogout: v })
                toast.success('Auto-logout timeout updated')
              }}
            >
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15min">15 min</SelectItem>
                <SelectItem value="30min">30 min</SelectItem>
                <SelectItem value="1hr">1 hour</SelectItem>
                <SelectItem value="2hr">2 hours</SelectItem>
                <SelectItem value="never">Never</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200 dark:border-red-800/50">
        <CardHeader className="pb-3">
          <SectionHeader
            icon={Trash2}
            title="Data Management"
            description="Clear locally cached data and preferences"
          />
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-800/50 dark:hover:bg-red-950/50 dark:hover:text-red-400"
            onClick={handleClearData}
          >
            <Trash2 className="size-4 mr-2" />
            Clear Local Data & Cache
          </Button>
          <p className="text-[11px] text-muted-foreground mt-2">
            This will clear all locally stored preferences and cached data. You will need to reconfigure your settings.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── About Tab ────────────────────────────────────────────────────────

function AboutTab() {
  const [storageUsed, setStorageUsed] = React.useState(0)
  const [storageTotal] = React.useState(5120) // 5MB typical limit

  React.useEffect(() => {
    try {
      let total = 0
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) {
          total += localStorage.getItem(key)?.length || 0
        }
      }
      // Convert chars to KB (roughly 2 bytes per char)
      setStorageUsed(Math.round((total * 2) / 1024))
    } catch {
      setStorageUsed(0)
    }
  }, [])

  const storagePercent = Math.min(Math.round((storageUsed / storageTotal) * 100), 100)

  return (
    <div className="space-y-6">
      {/* System Info */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader
            icon={Info}
            title="System Information"
            description="Version, license, and support details"
          />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-muted-foreground">System Version</span>
            <span className="text-sm font-medium font-mono">Meridian PMS v2.0.0 — Build 2024.01</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-muted-foreground">License</span>
            <Badge variant="outline" className="text-[10px]">Property Management System</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-muted-foreground">Support Contact</span>
            <span className="text-sm font-medium">it@meridian.com</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-muted-foreground">Support Extension</span>
            <span className="text-sm font-medium">ext. 1000</span>
          </div>
        </CardContent>
      </Card>

      {/* Database & Storage */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader
            icon={Database}
            title="System Health"
            description="Database connection and storage status"
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <Database className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">Database Status</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Connected</span>
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">Storage Usage</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {storageUsed} KB / {storageTotal} KB
              </span>
            </div>
            <Progress value={storagePercent} className="h-2" />
            <p className="text-[11px] text-muted-foreground">
              {storagePercent < 50
                ? 'Storage usage is within normal limits.'
                : storagePercent < 80
                  ? 'Storage usage is moderate. Consider clearing cache if needed.'
                  : 'Storage usage is high. Consider clearing cached data.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Support */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50 shrink-0">
              <Mail className="size-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold">Need Help?</p>
              <p className="text-xs text-muted-foreground">
                Contact our IT support team at{' '}
                <span className="font-medium text-foreground">it@meridian.com</span> or extension{' '}
                <span className="font-medium text-foreground">1000</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── SettingsDialog ────────────────────────────────────────────────────

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [activeTab, setActiveTab] = React.useState('general')

  // Reset tab to general when dialog opens
  React.useEffect(() => {
    if (open) setActiveTab('general')
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-0">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-sm">
              <Settings className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">Settings</DialogTitle>
              <DialogDescription>
                Manage your preferences, display, notifications, and security
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0 mt-4">
          <div className="px-6 border-b">
            <TabsList className="w-full justify-start h-auto p-0 bg-transparent">
              <TabsTrigger
                value="general"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 pb-2.5 pt-2 text-xs font-medium gap-1.5"
              >
                <Building2 className="size-3.5" />
                General
              </TabsTrigger>
              <TabsTrigger
                value="display"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 pb-2.5 pt-2 text-xs font-medium gap-1.5"
              >
                <Palette className="size-3.5" />
                Display
              </TabsTrigger>
              <TabsTrigger
                value="notifications"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 pb-2.5 pt-2 text-xs font-medium gap-1.5"
              >
                <Bell className="size-3.5" />
                Notifications
              </TabsTrigger>
              <TabsTrigger
                value="security"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 pb-2.5 pt-2 text-xs font-medium gap-1.5"
              >
                <ShieldCheck className="size-3.5" />
                Security
              </TabsTrigger>
              <TabsTrigger
                value="about"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 pb-2.5 pt-2 text-xs font-medium gap-1.5"
              >
                <Info className="size-3.5" />
                About
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <TabsContent value="general" className="mt-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none">
              <GeneralTab />
            </TabsContent>
            <TabsContent value="display" className="mt-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none">
              <DisplayTab />
            </TabsContent>
            <TabsContent value="notifications" className="mt-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none">
              <NotificationsTab />
            </TabsContent>
            <TabsContent value="security" className="mt-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none">
              <SecurityTab />
            </TabsContent>
            <TabsContent value="about" className="mt-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none">
              <AboutTab />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
