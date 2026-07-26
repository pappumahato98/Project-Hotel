'use client'

import * as React from 'react'
import { apiFetch } from '@/lib/api'
import { useTheme } from 'next-themes'
import { useSidebar } from '@/components/ui/sidebar'
import {
  Settings, Building2, Clock, Languages, Globe, Palette, Calendar,
  Coins, MonitorSmartphone, Bell, BellRing, LogIn, LogOut, ShieldCheck,
  Timer, Trash2, Info, Database, HardDrive, Mail, Star, Sun, Moon,
  Monitor, Users, KeyRound, AlertTriangle, Package, CreditCard,
  MoonStar, Phone, MapPin, Percent, Receipt, CreditCardIcon, Wallet,
  Building, Landmark, BadgeCheck, ShieldAlert, RotateCcw, CircleDollarSign,
  FileText, Clock4, Hotel, Globe2, ChevronRight, Save, Undo2, CheckCircle2,
  Printer, FileDown, BedDouble, Plug, Copy, RefreshCw, Eye, EyeOff,
  Key, Lock, Download, DatabaseBackup, Zap, BarChart3, ExternalLink, Wifi,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  useAuthStore, usePropertyStore, usePreferencesStore,
  useSettingsStore,
  type SystemSettings,
} from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

// ─── Constants ───────────────────────────────────────────────────────

const CURRENCY_MAP: Record<string, { symbol: string; name: string }> = {
  NPR: { symbol: 'Rs.', name: 'Nepalese Rupee' },
  USD: { symbol: '$', name: 'US Dollar' },
  EUR: { symbol: '\u20AC', name: 'Euro' },
  INR: { symbol: '\u20B9', name: 'Indian Rupee' },
  GBP: { symbol: '\u00A3', name: 'British Pound' },
  CNY: { symbol: '\u00A5', name: 'Chinese Yuan' },
}

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const hour = String(i).padStart(2, '0')
  return { value: `${hour}:00`, label: `${hour}:00` }
})

const CANCEL_POLICIES = [
  { value: 'flexible', label: 'Flexible', desc: 'Free cancellation up to 24 hours before check-in' },
  { value: 'moderate', label: 'Moderate', desc: 'Free cancellation up to 48 hours before check-in' },
  { value: 'strict', label: 'Strict', desc: '50% charge if cancelled within 72 hours, no refund within 24 hours' },
  { value: 'non_refundable', label: 'Non-Refundable', desc: 'No refund under any circumstances' },
]

const CARD_TYPES = [
  { value: 'visa', label: 'Visa', color: 'bg-blue-600' },
  { value: 'mastercard', label: 'Mastercard', color: 'bg-red-600' },
  { value: 'amex', label: 'American Express', color: 'bg-amber-500' },
  { value: 'jcb', label: 'JCB', color: 'bg-green-600' },
  { value: 'unionpay', label: 'UnionPay', color: 'bg-rose-600' },
]

const CONNECTED_CHANNELS = [
  { name: 'Booking.com', color: 'bg-sky-500', status: 'connected' as const },
  { name: 'Agoda', color: 'bg-rose-500', status: 'connected' as const },
  { name: 'Expedia', color: 'bg-amber-600', status: 'connected' as const },
  { name: 'Airbnb', color: 'bg-rose-400', status: 'disconnected' as const },
  { name: 'Trip.com', color: 'bg-cyan-600', status: 'disconnected' as const },
  { name: 'Direct Website', color: 'bg-emerald-500', status: 'connected' as const },
]

// ─── Shared Components ─────────────────────────────────────────────

function SectionHeader({
  icon: Icon, title, description,
}: {
  icon: React.ElementType; title: string; description: string
}) {
  return (
    <div className="flex items-start gap-3 mb-2">
      <div className="flex size-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0 mt-0.5">
        <Icon className="size-3.5 text-slate-600 dark:text-slate-400" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

function SettingRow({
  icon: Icon, label, description, children,
}: {
  icon?: React.ElementType; label: string; description?: string; children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className="flex size-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
            <Icon className="size-4 text-slate-600 dark:text-slate-400" />
          </div>
        )}
        <div className="min-w-0">
          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</Label>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function ToggleRow({
  icon, label, description, checked, onCheckedChange, disabled = false,
}: {
  icon?: React.ElementType; label: string; description?: string
  checked: boolean; onCheckedChange: (checked: boolean) => void; disabled?: boolean
}) {
  return (
    <SettingRow icon={icon} label={label} description={description}>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </SettingRow>
  )
}

function InfoRow({ label, value, badge }: {
  label: string; value: React.ReactNode; badge?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      {badge ? (
        <Badge variant="outline" className="text-[10px] capitalize">{value as React.ReactNode}</Badge>
      ) : (
        <span className="text-sm font-medium">{value as React.ReactNode}</span>
      )}
    </div>
  )
}

// ─── General Tab ─────────────────────────────────────────────────────

function GeneralTab() {
  const { activeProperty, setActiveProperty } = usePropertyStore()
  const { preferences, updatePreferences } = usePreferencesStore()
  const { settings, saveToBackend } = useSettingsStore()

  const [name, setName] = React.useState(settings.hotelName)
  const [code, setCode] = React.useState(settings.hotelCode)
  const [city, setCity] = React.useState(settings.city)
  const [country, setCountry] = React.useState(settings.country)
  const [phone, setPhone] = React.useState(settings.phone)
  const [email, setEmail] = React.useState(settings.email)
  const [address, setAddress] = React.useState(settings.address)
  const [website, setWebsite] = React.useState(settings.website)
  const [starRating, setStarRating] = React.useState(String(settings.starRating))
  const [checkIn, setCheckIn] = React.useState(settings.defaultCheckIn)
  const [checkOut, setCheckOut] = React.useState(settings.defaultCheckOut)
  const [nightAudit, setNightAudit] = React.useState(settings.nightAuditTime)

  React.useEffect(() => {
    setName(settings.hotelName)
    setCode(settings.hotelCode)
    setCity(settings.city)
    setCountry(settings.country)
    setPhone(settings.phone)
    setEmail(settings.email)
    setAddress(settings.address)
    setWebsite(settings.website)
    setStarRating(String(settings.starRating))
    setCheckIn(settings.defaultCheckIn)
    setCheckOut(settings.defaultCheckOut)
    setNightAudit(settings.nightAuditTime)
  }, [settings])

  const handleSaveField = async (field: string, value: string | number) => {
    await saveToBackend({ [field]: value } as any)
    setActiveProperty({ ...activeProperty, [field]: value })
  }

  return (
    <div className="space-y-4">
      {/* Property Information */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader icon={Building2} title="Property Information" description="Manage your hotel details and contact information" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Hotel Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={async () => { await handleSaveField('hotelName', name) }} className="h-7" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Hotel Code</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} onBlur={async () => { await handleSaveField('hotelCode', code) }} className="h-7" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Address</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} onBlur={async () => { await handleSaveField('address', address) }} className="h-7" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} onBlur={async () => { await handleSaveField('city', city) }} className="h-7" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Country</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} onBlur={async () => { await handleSaveField('country', country) }} className="h-7" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} onBlur={async () => { await handleSaveField('phone', phone) }} className="h-7" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={async () => { await handleSaveField('email', email) }} className="h-7" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Website</Label>
              <Input value={website} onChange={(e) => setWebsite(e.target.value)} onBlur={async () => { await handleSaveField('website', website) }} className="h-7" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Star Rating</Label>
            <Select value={starRating} onValueChange={async (v) => { setStarRating(v); await handleSaveField('starRating', parseInt(v)) }}>
              <SelectTrigger className="w-24 h-7 text-xs">
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
          <SectionHeader icon={Clock} title="Business Hours" description="Default check-in, check-out, and night audit times" />
        </CardHeader>
        <CardContent className="space-y-3">
          <SettingRow icon={LogIn} label="Default Check-In" description="Standard guest arrival time">
            <Select value={checkIn} onValueChange={async (v) => { setCheckIn(v); await handleSaveField('defaultCheckIn', v) }}>
              <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-48">
                {TIME_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>
          <Separator />
          <SettingRow icon={LogOut} label="Default Check-Out" description="Standard guest departure time">
            <Select value={checkOut} onValueChange={async (v) => { setCheckOut(v); await handleSaveField('defaultCheckOut', v) }}>
              <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-48">
                {TIME_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>
          <Separator />
          <SettingRow icon={MoonStar} label="Night Audit Time" description="When the daily night audit runs">
            <Select value={nightAudit} onValueChange={async (v) => { setNightAudit(v); await handleSaveField('nightAuditTime', v) }}>
              <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
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
          <SectionHeader icon={Globe} title="Regional Settings" description="Language, timezone, and locale preferences" />
        </CardHeader>
        <CardContent className="space-y-3">
          <SettingRow icon={Languages} label="Language" description="Interface display language">
            <Select value={preferences.language} onValueChange={(v) => { updatePreferences({ language: v }); toast.success('Language updated') }}>
              <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ne">&#x0928;&#x0947;&#x092A;&#x093E;&#x0932;&#x0940;</SelectItem>
                <SelectItem value="hi">&#x0939;&#x093F;&#x0928;&#x094D;&#x0926;&#x0940;</SelectItem>
                <SelectItem value="zh">&#x4E2D;&#x6587;</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
          <Separator />
          <SettingRow icon={Globe} label="Timezone" description="Business operating timezone">
            <Select value={preferences.timezone} onValueChange={(v) => { updatePreferences({ timezone: v }); toast.success('Timezone updated') }}>
              <SelectTrigger className="w-40 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Asia/Katmandu">Asia/Kathmandu (NPT +5:45)</SelectItem>
                <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</SelectItem>
                <SelectItem value="Asia/Dhaka">Asia/Dhaka (BST +6:00)</SelectItem>
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

  return (
    <div className="space-y-4">
      {/* Theme */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader icon={Palette} title="Appearance" description="Customize the look and feel of the interface" />
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
                  {[
                    { value: 'light', icon: Sun, label: 'Light' },
                    { value: 'dark', icon: Moon, label: 'Dark' },
                    { value: 'system', icon: Monitor, label: 'System' },
                  ].map(({ value, icon: Icon, label }) => (
                    <Button
                      key={value}
                      size="sm"
                      variant={theme === value ? 'default' : 'ghost'}
                      className="size-8 p-0 text-xs"
                      onClick={() => { setTheme(value as any); toast.success(`${label} mode`) }}
                    >
                      <Icon className="size-3.5 mr-1" />
                      <span className="hidden sm:inline">{label}</span>
                    </Button>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Current: {resolvedTheme === 'dark' ? 'Dark' : 'Light'} mode
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Format & Layout */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader icon={Calendar} title="Format & Layout" description="Date format, currency display, and interface density" />
        </CardHeader>
        <CardContent className="space-y-3">
          <SettingRow icon={Calendar} label="Date Format" description="How dates are displayed throughout the system">
            <Select value={preferences.dateFormat} onValueChange={(v) => { updatePreferences({ dateFormat: v }); toast.success('Date format updated') }}>
              <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
          <Separator />
          <SettingRow icon={Coins} label="Currency" description="Default currency for all amounts">
            <Select value={preferences.currency} onValueChange={(v) => { updatePreferences({ currency: v }); toast.success('Currency updated') }}>
              <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(CURRENCY_MAP).map(([code, { symbol, name }]) => (
                  <SelectItem key={code} value={code}>
                    {code} ({symbol}) &mdash; {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>
          <Separator />
          <ToggleRow
            icon={MonitorSmartphone} label="Compact Mode"
            description="Reduce spacing in tables and lists for denser view"
            checked={preferences.compactMode}
            onCheckedChange={(v) => { updatePreferences({ compactMode: v }); toast.success(v ? 'Compact mode enabled' : 'Compact mode disabled') }}
          />
        </CardContent>
      </Card>

      {/* Sidebar */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader icon={MonitorSmartphone} title="Sidebar" description="Control the sidebar appearance and behavior" />
        </CardHeader>
        <CardContent className="space-y-3">
          <SettingRow
            icon={state === 'collapsed' ? MonitorSmartphone : Monitor}
            label="Sidebar State" description="Toggle sidebar expanded/collapsed"
          >
            <div className="flex items-center gap-1 rounded-lg border p-0.5">
              <Button
                size="sm"
                variant={state === 'expanded' ? 'default' : 'ghost'}
                className="size-8 p-0 text-xs"
                onClick={() => { if (state === 'collapsed') toggleSidebar() }}
              >
                <span>Expanded</span>
              </Button>
              <Button
                size="sm"
                variant={state === 'collapsed' ? 'default' : 'ghost'}
                className="size-8 p-0 text-xs"
                onClick={() => { if (state === 'expanded') toggleSidebar() }}
              >
                <span>Collapsed</span>
              </Button>
            </div>
          </SettingRow>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Tax & Fees Tab ────────────────────────────────────────────────────

function TaxFeesTab() {
  const { settings, saveToBackend } = useSettingsStore()
  const [taxRate, setTaxRate] = React.useState(String(settings.taxRate))
  const [serviceCharge, setServiceCharge] = React.useState(String(settings.serviceCharge))
  const [tourismTax, setTourismTax] = React.useState(String(settings.tourismTax))

  React.useEffect(() => {
    setTaxRate(String(settings.taxRate))
    setServiceCharge(String(settings.serviceCharge))
    setTourismTax(String(settings.tourismTax))
  }, [settings.taxRate, settings.serviceCharge, settings.tourismTax])

  return (
    <div className="space-y-4">
      {/* Tax Configuration */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader icon={Percent} title="Tax Configuration" description="Configure tax rates applied to guest invoices" />
        </CardHeader>
        <CardContent className="space-y-3">
          <SettingRow icon={Receipt} label="Value Added Tax (VAT)" description="Primary tax rate applied to room charges and services">
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                onBlur={async () => { await saveToBackend({ taxRate: parseFloat(taxRate) || 0 }) }}
                className="w-20 h-7 text-xs text-right"
                min="0" max="100" step="0.5"
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          </SettingRow>
          <Separator />
          <SettingRow icon={CircleDollarSign} label="Service Charge" description="Additional service charge applied to guest folios">
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                value={serviceCharge}
                onChange={(e) => setServiceCharge(e.target.value)}
                onBlur={async () => { await saveToBackend({ serviceCharge: parseFloat(serviceCharge) || 0 }) }}
                className="w-20 h-7 text-xs text-right"
                min="0" max="100" step="0.5"
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          </SettingRow>
          <Separator />
          <SettingRow icon={Landmark} label="Tourism / Local Tax" description="Local government tourism levy per night">
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                value={tourismTax}
                onChange={(e) => setTourismTax(e.target.value)}
                onBlur={async () => { await saveToBackend({ tourismTax: parseFloat(tourismTax) || 0 }) }}
                className="w-20 h-7 text-xs text-right"
                min="0" step="10"
              />
              <span className="text-xs text-muted-foreground">NPR</span>
            </div>
          </SettingRow>
        </CardContent>
      </Card>

      {/* Tax Summary Preview */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Receipt className="size-4" />
            Tax Summary Preview
          </CardTitle>
          <CardDescription className="text-xs">Estimated total charges for a Rs. 5,000 room rate</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Room Rate</span>
              <span className="font-medium">Rs. 5,000.00</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">VAT ({settings.taxRate}%)</span>
              <span className="font-medium">Rs. {(5000 * settings.taxRate / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Service Charge ({settings.serviceCharge}%)</span>
              <span className="font-medium">Rs. {(5000 * settings.serviceCharge / 100).toFixed(2)}</span>
            </div>
            {settings.tourismTax > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tourism Tax (per night)</span>
                <span className="font-medium">Rs. {settings.tourismTax.toFixed(2)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-sm font-semibold">
              <span>Guest Total</span>
              <span>Rs. {(5000 + 5000 * settings.taxRate / 100 + 5000 * settings.serviceCharge / 100 + settings.tourismTax).toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Booking Policies Tab ────────────────────────────────────────────

function BookingPoliciesTab() {
  const { settings, saveToBackend } = useSettingsStore()

  const [cancelPolicy, setCancelPolicy] = React.useState(settings.cancellationPolicy)
  const [cancelHours, setCancelHours] = React.useState(String(settings.cancellationHours))
  const [noShowCharge, setNoShowCharge] = React.useState(String(settings.noShowCharge))
  const [depositRequired, setDepositRequired] = React.useState(settings.depositRequired)
  const [depositPercent, setDepositPercent] = React.useState(String(settings.depositPercent))
  const [earlyCheckInCharge, setEarlyCheckInCharge] = React.useState(String(settings.earlyCheckInCharge))
  const [lateCheckoutCharge, setLateCheckoutCharge] = React.useState(String(settings.lateCheckoutCharge))
  const [guaranteeRequired, setGuaranteeRequired] = React.useState(settings.guaranteeRequired)

  React.useEffect(() => {
    setCancelPolicy(settings.cancellationPolicy)
    setCancelHours(String(settings.cancellationHours))
    setNoShowCharge(String(settings.noShowCharge))
    setDepositRequired(settings.depositRequired)
    setDepositPercent(String(settings.depositPercent))
    setEarlyCheckInCharge(String(settings.earlyCheckInCharge))
    setLateCheckoutCharge(String(settings.lateCheckoutCharge))
    setGuaranteeRequired(settings.guaranteeRequired)
  }, [settings])

  const handleSave = async (field: string, value: any) => {
    await saveToBackend({ [field]: value } as any)
  }

  return (
    <div className="space-y-4">
      {/* Cancellation Policy */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader icon={ShieldAlert} title="Cancellation Policy" description="Rules governing reservation cancellations" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Policy Type</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CANCEL_POLICIES.map((p) => (
                <button
                  key={p.value}
                  className={cn(
                    'flex flex-col items-start rounded-lg border p-3 text-left transition-all',
                    cancelPolicy === p.value
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 ring-1 ring-amber-500/20'
                      : 'hover:bg-muted/50'
                  )}
                  onClick={() => { setCancelPolicy(p.value); handleSave('cancellationPolicy', p.value) }}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'size-4 rounded-full border-2 flex items-center justify-center',
                      cancelPolicy === p.value ? 'border-amber-500' : 'border-muted-foreground/30'
                    )}>
                      {cancelPolicy === p.value && <div className="size-2 rounded-full bg-amber-500" />}
                    </div>
                    <span className="text-sm font-medium">{p.label}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 ml-6">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs">Custom Cancellation Window</Label>
              <p className="text-[11px] text-muted-foreground">Hours before check-in for free cancellation</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                value={cancelHours}
                onChange={(e) => setCancelHours(e.target.value)}
                onBlur={() => handleSave('cancellationHours', parseInt(cancelHours) || 24)}
                className="w-20 h-7 text-xs text-right"
                min="0" max="720"
              />
              <span className="text-xs text-muted-foreground">hours</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* No-Show & Deposit */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader icon={ShieldCheck} title="Guarantee & Deposit" description="Payment requirements for reservations" />
        </CardHeader>
        <CardContent className="space-y-3">
          <SettingRow
            icon={BadgeCheck}
            label="Guarantee Required"
            description="Require a guarantee for all reservations"
          >
            <Switch checked={guaranteeRequired} onCheckedChange={(v) => { setGuaranteeRequired(v); handleSave('guaranteeRequired', v) }} />
          </SettingRow>
          <Separator />
          <SettingRow
            icon={CreditCard}
            label="Deposit Required"
            description="Require advance deposit for confirmed bookings"
          >
            <Switch checked={depositRequired} onCheckedChange={(v) => { setDepositRequired(v); handleSave('depositRequired', v) }} />
          </SettingRow>
          {depositRequired && (
            <>
              <Separator />
              <SettingRow
                icon={Percent}
                label="Deposit Percentage"
                description="Percentage of total amount required as deposit"
              >
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    value={depositPercent}
                    onChange={(e) => setDepositPercent(e.target.value)}
                    onBlur={() => handleSave('depositPercent', parseInt(depositPercent) || 20)}
                    className="w-20 h-7 text-xs text-right"
                    min="5" max="100" step="5"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </SettingRow>
            </>
          )}
          <Separator />
          <SettingRow
            icon={AlertTriangle}
            label="No-Show Charge"
            description="Percentage charged for no-show guests"
          >
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                value={noShowCharge}
                onChange={(e) => setNoShowCharge(e.target.value)}
                onBlur={() => handleSave('noShowCharge', parseInt(noShowCharge) || 100)}
                className="w-20 h-7 text-xs text-right"
                min="0" max="100" step="10"
              />
              <span className="text-xs text-muted-foreground">% of stay</span>
            </div>
          </SettingRow>
        </CardContent>
      </Card>

      {/* Early/Late */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader icon={Clock4} title="Early Check-In & Late Checkout" description="Charges for special time requests" />
        </CardHeader>
        <CardContent className="space-y-3">
          <SettingRow
            icon={LogIn}
            label="Early Check-In Fee"
            description="Charge for check-in before standard time"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Rs.</span>
              <Input
                type="number"
                value={earlyCheckInCharge}
                onChange={(e) => setEarlyCheckInCharge(e.target.value)}
                onBlur={() => handleSave('earlyCheckInCharge', parseInt(earlyCheckInCharge) || 0)}
                className="w-20 h-7 text-xs text-right"
                min="0" step="100"
              />
            </div>
          </SettingRow>
          <Separator />
          <SettingRow
            icon={LogOut}
            label="Late Checkout Fee"
            description="Charge for checkout after standard time"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Rs.</span>
              <Input
                type="number"
                value={lateCheckoutCharge}
                onChange={(e) => setLateCheckoutCharge(e.target.value)}
                onBlur={() => handleSave('lateCheckoutCharge', parseInt(lateCheckoutCharge) || 0)}
                className="w-20 h-7 text-xs text-right"
                min="0" step="100"
              />
            </div>
          </SettingRow>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Payment Methods Tab ──────────────────────────────────────────────

function PaymentMethodsTab() {
  const { settings, saveToBackend } = useSettingsStore()

  const handleToggleMethod = async (field: string, value: boolean) => {
    await saveToBackend({ [field]: value } as any)
  }

  const handleToggleCardType = async (type: string, checked: boolean) => {
    const cardTypes = checked
      ? [...settings.cardTypes, type]
      : settings.cardTypes.filter((c) => c !== type)
    await saveToBackend({ cardTypes })
  }

  return (
    <div className="space-y-4">
      {/* Accepted Methods */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader icon={Wallet} title="Accepted Payment Methods" description="Enable or disable payment methods at your property" />
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleRow
            icon={CircleDollarSign} label="Cash" description="Accept cash payments at front desk"
            checked={settings.acceptCash} onCheckedChange={(v) => handleToggleMethod('acceptCash', v)}
          />
          <Separator />
          <ToggleRow
            icon={CreditCard} label="Credit / Debit Card" description="Accept card payments via POS terminal"
            checked={settings.acceptCard} onCheckedChange={(v) => handleToggleMethod('acceptCard', v)}
          />
          <Separator />
          <ToggleRow
            icon={Landmark} label="Bank Transfer" description="Accept direct bank transfers and wire transfers"
            checked={settings.acceptBankTransfer} onCheckedChange={(v) => handleToggleMethod('acceptBankTransfer', v)}
          />
          <Separator />
          <ToggleRow
            icon={Wallet} label="Digital Wallet" description="Accept eSewa, Khalti, IME Pay, and other digital wallets"
            checked={settings.acceptDigitalWallet} onCheckedChange={(v) => handleToggleMethod('acceptDigitalWallet', v)}
          />
          <Separator />
          <ToggleRow
            icon={FileText} label="Cheque" description="Accept company and personal cheques"
            checked={settings.acceptCheque} onCheckedChange={(v) => handleToggleMethod('acceptCheque', v)}
          />
        </CardContent>
      </Card>

      {/* Card Types */}
      {settings.acceptCard && (
        <Card>
          <CardHeader className="pb-3">
            <SectionHeader icon={CreditCardIcon} title="Accepted Card Types" description="Select which card networks are accepted" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CARD_TYPES.map((card) => {
                const checked = settings.cardTypes.includes(card.value)
                return (
                  <label
                    key={card.value}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all',
                      checked
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => handleToggleCardType(card.value, !!v)}
                    />
                    <div className={cn('size-8 rounded flex items-center justify-center text-white text-[10px] font-bold', card.color)}>
                      {card.label.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium">{card.label}</span>
                  </label>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Summary */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/50 shrink-0">
              <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold">
                {[
                  settings.acceptCash && 'Cash',
                  settings.acceptCard && 'Card',
                  settings.acceptBankTransfer && 'Bank Transfer',
                  settings.acceptDigitalWallet && 'Digital Wallet',
                  settings.acceptCheque && 'Cheque',
                ].filter(Boolean).length} payment method(s) active
              </p>
              <p className="text-xs text-muted-foreground">
                Guests can pay using any of the enabled methods at checkout
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Room Defaults Tab ───────────────────────────────────────────────

function RoomDefaultsTab() {
  const { settings, saveToBackend } = useSettingsStore()

  const [maxOccupancy, setMaxOccupancy] = React.useState(String(settings.defaultMaxOccupancy))
  const [defaultFloor, setDefaultFloor] = React.useState(String(settings.defaultFloor))
  const [minNights, setMinNights] = React.useState(String(settings.minNightsDefault))
  const [maxNights, setMaxNights] = React.useState(String(settings.maxNightsDefault))

  React.useEffect(() => {
    setMaxOccupancy(String(settings.defaultMaxOccupancy))
    setDefaultFloor(String(settings.defaultFloor))
    setMinNights(String(settings.minNightsDefault))
    setMaxNights(String(settings.maxNightsDefault))
  }, [settings.defaultMaxOccupancy, settings.defaultFloor, settings.minNightsDefault, settings.maxNightsDefault])

  const handleSave = async (field: string, value: number) => {
    await saveToBackend({ [field]: value } as any)
  }

  return (
    <div className="space-y-4">
      {/* Occupancy & Floor */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader icon={BedDouble} title="Room Defaults" description="Default settings applied when creating new rooms" />
        </CardHeader>
        <CardContent className="space-y-3">
          <SettingRow icon={Users} label="Default Max Occupancy" description="Standard guest count per room">
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                value={maxOccupancy}
                onChange={(e) => setMaxOccupancy(e.target.value)}
                onBlur={() => handleSave('defaultMaxOccupancy', parseInt(maxOccupancy) || 2)}
                className="w-20 h-7 text-xs text-right"
                min="1" max="10"
              />
              <span className="text-xs text-muted-foreground">guests</span>
            </div>
          </SettingRow>
          <Separator />
          <SettingRow icon={Building2} label="Default Floor Assignment" description="Floor number for new rooms by default">
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                value={defaultFloor}
                onChange={(e) => setDefaultFloor(e.target.value)}
                onBlur={() => handleSave('defaultFloor', parseInt(defaultFloor) || 1)}
                className="w-20 h-7 text-xs text-right"
                min="1" max="50"
              />
              <span className="text-xs text-muted-foreground">floor</span>
            </div>
          </SettingRow>
          <Separator />
          <ToggleRow
            icon={Zap} label="Auto-Assign Room on Reservation"
            description="Automatically assign best available room when a booking is made"
            checked={settings.autoAssignRoom}
            onCheckedChange={async (v) => { await saveToBackend({ autoAssignRoom: v }) }}
          />
          <Separator />
          <ToggleRow
            icon={CheckCircle2} label="Auto Room Status Update After Checkout"
            description="Automatically set room to dirty/vacant after guest checkout"
            checked={settings.autoRoomStatusUpdate}
            onCheckedChange={async (v) => { await saveToBackend({ autoRoomStatusUpdate: v }) }}
          />
        </CardContent>
      </Card>

      {/* Stay Limits */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader icon={Clock4} title="Stay Limits" description="Minimum and maximum night restrictions for bookings" />
        </CardHeader>
        <CardContent className="space-y-3">
          <SettingRow icon={Calendar} label="Minimum Nights Default" description="Shortest allowed stay duration">
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                value={minNights}
                onChange={(e) => setMinNights(e.target.value)}
                onBlur={() => handleSave('minNightsDefault', parseInt(minNights) || 1)}
                className="w-20 h-7 text-xs text-right"
                min="1" max="30"
              />
              <span className="text-xs text-muted-foreground">nights</span>
            </div>
          </SettingRow>
          <Separator />
          <SettingRow icon={Calendar} label="Maximum Nights Default" description="Longest allowed stay duration">
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                value={maxNights}
                onChange={(e) => setMaxNights(e.target.value)}
                onBlur={() => handleSave('maxNightsDefault', parseInt(maxNights) || 30)}
                className="w-20 h-7 text-xs text-right"
                min="1" max="365"
              />
              <span className="text-xs text-muted-foreground">nights</span>
            </div>
          </SettingRow>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Email & Communication Tab ────────────────────────────────────────

function EmailTab() {
  const { settings, saveToBackend } = useSettingsStore()

  const [smtpHost, setSmtpHost] = React.useState(settings.smtpHost)
  const [smtpPort, setSmtpPort] = React.useState(String(settings.smtpPort))
  const [smtpUser, setSmtpUser] = React.useState(settings.smtpUser)
  const [smtpEncryption, setSmtpEncryption] = React.useState(settings.smtpEncryption)
  const [emailFromName, setEmailFromName] = React.useState(settings.emailFromName)
  const [emailSignature, setEmailSignature] = React.useState(settings.emailSignature)

  React.useEffect(() => {
    setSmtpHost(settings.smtpHost)
    setSmtpPort(String(settings.smtpPort))
    setSmtpUser(settings.smtpUser)
    setSmtpEncryption(settings.smtpEncryption)
    setEmailFromName(settings.emailFromName)
    setEmailSignature(settings.emailSignature)
  }, [settings.smtpHost, settings.smtpPort, settings.smtpUser, settings.smtpEncryption, settings.emailFromName, settings.emailSignature])

  const handleSave = async (field: string, value: string | number) => {
    await saveToBackend({ [field]: value } as any)
  }

  return (
    <div className="space-y-4">
      {/* SMTP Configuration */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader icon={Mail} title="SMTP Configuration" description="Outgoing mail server settings for guest emails" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">SMTP Host</Label>
              <Input
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                onBlur={() => handleSave('smtpHost', smtpHost)}
                className="h-7"
                placeholder="smtp.example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">SMTP Port</Label>
              <Input
                type="number"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                onBlur={() => handleSave('smtpPort', parseInt(smtpPort) || 587)}
                className="h-7"
                min="1" max="65535"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">SMTP Username</Label>
              <Input
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                onBlur={() => handleSave('smtpUser', smtpUser)}
                className="h-7"
                placeholder="noreply@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">SMTP Encryption</Label>
              <Select value={smtpEncryption} onValueChange={(v) => { setSmtpEncryption(v); handleSave('smtpEncryption', v) }}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tls">TLS</SelectItem>
                  <SelectItem value="ssl">SSL</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Identity */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader icon={Mail} title="Email Identity" description="Sender name and signature for outgoing emails" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Email From Name</Label>
            <Input
              value={emailFromName}
              onChange={(e) => setEmailFromName(e.target.value)}
              onBlur={() => handleSave('emailFromName', emailFromName)}
              className="h-7"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email Signature</Label>
            <Textarea
              value={emailSignature}
              onChange={(e) => setEmailSignature(e.target.value)}
              onBlur={() => handleSave('emailSignature', emailSignature)}
              className="min-h-[80px] text-xs"
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Automated Emails */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader icon={BellRing} title="Automated Emails" description="Toggle which guest emails are sent automatically" />
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleRow
            icon={FileText} label="Send Booking Confirmation"
            description="Automatically email guests when reservation is confirmed"
            checked={settings.sendBookingConfirmation}
            onCheckedChange={async (v) => { await saveToBackend({ sendBookingConfirmation: v }) }}
          />
          <Separator />
          <ToggleRow
            icon={LogOut} label="Send Checkout Reminder"
            description="Remind guests about checkout time on day of departure"
            checked={settings.sendCheckoutReminder}
            onCheckedChange={async (v) => { await saveToBackend({ sendCheckoutReminder: v }) }}
          />
          <Separator />
          <ToggleRow
            icon={BarChart3} label="Send Promotional Emails"
            description="Send marketing and promotional offers to guests"
            checked={settings.sendPromoEmails}
            onCheckedChange={async (v) => { await saveToBackend({ sendPromoEmails: v }) }}
          />
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Printing & Documents Tab ─────────────────────────────────────────

function PrintingTab() {
  const { settings, saveToBackend } = useSettingsStore()

  const [printHeader, setPrintHeader] = React.useState(settings.printHeader)
  const [printFooter, setPrintFooter] = React.useState(settings.printFooter)
  const [invoiceFormat, setInvoiceFormat] = React.useState(settings.invoiceFormat)
  const [receiptCopies, setReceiptCopies] = React.useState(String(settings.receiptCopies))

  React.useEffect(() => {
    setPrintHeader(settings.printHeader)
    setPrintFooter(settings.printFooter)
    setInvoiceFormat(settings.invoiceFormat)
    setReceiptCopies(String(settings.receiptCopies))
  }, [settings.printHeader, settings.printFooter, settings.invoiceFormat, settings.receiptCopies])

  const handleSave = async (field: string, value: string | number) => {
    await saveToBackend({ [field]: value } as any)
  }

  return (
    <div className="space-y-4">
      {/* Auto-Print */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader icon={Printer} title="Auto-Print Settings" description="Configure automatic printing behavior" />
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleRow
            icon={Printer} label="Auto-Print Receipts"
            description="Automatically print a receipt when payment is recorded"
            checked={settings.autoPrintReceipt}
            onCheckedChange={async (v) => { await saveToBackend({ autoPrintReceipt: v }) }}
          />
          <Separator />
          <ToggleRow
            icon={FileDown} label="Auto-Print Folio at Checkout"
            description="Automatically print guest folio when checkout is completed"
            checked={settings.autoPrintFolio}
            onCheckedChange={async (v) => { await saveToBackend({ autoPrintFolio: v }) }}
          />
        </CardContent>
      </Card>

      {/* Receipt & Invoice Format */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader icon={FileText} title="Receipt & Invoice Format" description="Customize the appearance of printed documents" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Receipt/Invoice Header Text</Label>
            <Input
              value={printHeader}
              onChange={(e) => setPrintHeader(e.target.value)}
              onBlur={() => handleSave('printHeader', printHeader)}
              className="h-7"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Receipt/Invoice Footer Text</Label>
            <Input
              value={printFooter}
              onChange={(e) => setPrintFooter(e.target.value)}
              onBlur={() => handleSave('printFooter', printFooter)}
              className="h-7"
            />
          </div>
          <SettingRow icon={Star} label="Show Hotel Logo on Print" description="Display property logo on printed receipts and invoices">
            <Switch
              checked={settings.showLogoOnPrint}
              onCheckedChange={async (v) => { await saveToBackend({ showLogoOnPrint: v }) }}
            />
          </SettingRow>
          <Separator />
          <SettingRow icon={FileText} label="Invoice Format" description="Level of detail on printed invoices">
            <Select value={invoiceFormat} onValueChange={(v) => { setInvoiceFormat(v); handleSave('invoiceFormat', v) }}>
              <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="detailed">Detailed</SelectItem>
                <SelectItem value="summary">Summary</SelectItem>
                <SelectItem value="mini">Mini</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
          <Separator />
          <SettingRow icon={Printer} label="Number of Receipt Copies" description="How many copies to print per receipt">
            <Select value={receiptCopies} onValueChange={(v) => { setReceiptCopies(v); handleSave('receiptCopies', parseInt(v)) }}>
              <SelectTrigger className="w-20 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Notifications Tab ────────────────────────────────────────────────

// Key mapping: UI short keys → backend field names
const NOTIF_KEY_MAP: Record<string, keyof SystemSettings> = {
  checkInReminders: 'notifCheckInReminders',
  checkOutReminders: 'notifCheckOutReminders',
  overbookingAlerts: 'notifOverbookingAlerts',
  lowStockAlerts: 'notifLowStockAlerts',
  paymentReceived: 'notifPaymentReceived',
  nightAuditAlert: 'notifNightAuditAlert',
  newReservations: 'notifNewReservations',
  maintenanceAlerts: 'notifMaintenanceAlerts',
  shiftHandover: 'notifShiftHandover',
  hkTaskCompleted: 'notifHkTaskCompleted',
}

function NotificationsTab() {
  const { preferences, updatePreferences } = usePreferencesStore()
  const { settings, saveToBackend } = useSettingsStore()

  const masterEnabled = preferences.notifications

  const handleToggle = (uiKey: string, value: boolean) => {
    const settingsKey = NOTIF_KEY_MAP[uiKey]
    if (settingsKey) {
      saveToBackend({ [settingsKey]: value } as Partial<SystemSettings>)
    }
  }

  const handleMasterToggle = (value: boolean) => {
    updatePreferences({ notifications: value })
  }

  const notifGroups = [
    {
      title: 'Front Desk',
      icon: Hotel,
      items: [
        { key: 'checkInReminders', icon: LogIn, label: 'Check-in Reminders', desc: 'Upcoming guest arrivals' },
        { key: 'checkOutReminders', icon: LogOut, label: 'Check-out Reminders', desc: 'Departing guests and room turnover' },
        { key: 'newReservations', icon: FileText, label: 'New Reservations', desc: 'Incoming booking confirmations' },
      ],
    },
    {
      title: 'Operations',
      icon: Clock,
      items: [
        { key: 'nightAuditAlert', icon: MoonStar, label: 'Night Audit Alert', desc: 'Daily audit reminder' },
        { key: 'shiftHandover', icon: Timer, label: 'Shift Handover', desc: 'Upcoming shift change notifications' },
      ],
    },
    {
      title: 'Housekeeping',
      icon: Users,
      items: [
        { key: 'hkTaskCompleted', icon: CheckCircle2, label: 'Task Completed', desc: 'When a housekeeping task is finished' },
      ],
    },
    {
      title: 'Finance & Inventory',
      icon: CreditCard,
      items: [
        { key: 'paymentReceived', icon: CreditCard, label: 'Payment Received', desc: 'When a payment is recorded' },
        { key: 'overbookingAlerts', icon: AlertTriangle, label: 'Overbooking Alerts', desc: 'Double booking warnings' },
        { key: 'lowStockAlerts', icon: Package, label: 'Low Stock Alerts', desc: 'Inventory below minimum levels' },
      ],
    },
    {
      title: 'Maintenance',
      icon: KeyRound,
      items: [
        { key: 'maintenanceAlerts', icon: AlertTriangle, label: 'Work Order Updates', desc: 'Maintenance task status changes' },
      ],
    },
  ]

  return (
    <div className="space-y-4">
      {/* Master Toggle */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <ToggleRow
            icon={BellRing} label="Enable All Notifications"
            description="Master switch for all notification types"
            checked={masterEnabled}
            onCheckedChange={handleMasterToggle}
          />
          {!masterEnabled && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 dark:bg-amber-950/30 dark:border-amber-800">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Notifications are currently disabled. Enable the master switch to receive alerts.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Groups */}
      {notifGroups.map((group) => (
        <Card key={group.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <group.icon className="size-4" />
              {group.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {group.items.map((item, i) => {
              const settingsKey = NOTIF_KEY_MAP[item.key]
              return (
                <React.Fragment key={item.key}>
                  <ToggleRow
                    icon={item.icon} label={item.label} description={item.desc}
                    checked={settingsKey ? (settings[settingsKey] as boolean) : false}
                    onCheckedChange={(v) => handleToggle(item.key, v)}
                    disabled={!masterEnabled}
                  />
                  {i < group.items.length - 1 && <Separator />}
                </React.Fragment>
              )
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ─── Integrations Tab ────────────────────────────────────────────────

function IntegrationsTab() {
  const { settings, saveToBackend } = useSettingsStore()

  const [webhookUrl, setWebhookUrl] = React.useState(settings.webhookUrl)
  const [channelSync, setChannelSync] = React.useState(String(settings.channelSyncInterval))
  const [showApiKey, setShowApiKey] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    setWebhookUrl(settings.webhookUrl)
    setChannelSync(String(settings.channelSyncInterval))
  }, [settings.webhookUrl, settings.channelSyncInterval])

  const handleCopyKey = () => {
    navigator.clipboard.writeText(settings.apiKey)
    setCopied(true)
    toast.success('API key copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRegenerateKey = async () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let key = 'mrk_api_'
    for (let i = 0; i < 24; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    await saveToBackend({ apiKey: key })
    toast.success('API key regenerated')
  }

  return (
    <div className="space-y-4">
      {/* API Configuration */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader icon={Key} title="API Configuration" description="Manage your API access credentials" />
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleRow
            icon={Zap} label="API Enabled"
            description="Allow external applications to access the API"
            checked={settings.apiEnabled}
            onCheckedChange={async (v) => { await saveToBackend({ apiEnabled: v }) }}
          />
          <Separator />
          <SettingRow icon={Key} label="API Key" description="Unique key for API authentication">
            <div className="flex items-center gap-1.5">
              <Input
                type={showApiKey ? 'text' : 'password'}
                value={settings.apiKey}
                readOnly
                className="w-48 h-7 text-xs font-mono"
              />
              <Button
                variant="ghost"
                size="sm"
                className="size-8 p-0"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="size-8 p-0"
                onClick={handleCopyKey}
              >
                {copied ? <CheckCircle2 className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="size-8 p-0"
                onClick={handleRegenerateKey}
              >
                <RefreshCw className="size-3.5" />
              </Button>
            </div>
          </SettingRow>
          <Separator />
          <SettingRow icon={Timer} label="Channel Sync Interval" description="How often to sync with connected channels">
            <Select value={channelSync} onValueChange={async (v) => { setChannelSync(v); await saveToBackend({ channelSyncInterval: parseInt(v) }) }}>
              <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 min</SelectItem>
                <SelectItem value="10">10 min</SelectItem>
                <SelectItem value="15">15 min</SelectItem>
                <SelectItem value="30">30 min</SelectItem>
                <SelectItem value="60">60 min</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
        </CardContent>
      </Card>

      {/* Webhooks */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader icon={Wifi} title="Webhooks" description="Receive real-time event notifications via HTTP" />
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleRow
            icon={Wifi} label="Webhooks Enabled"
            description="Send event data to external endpoints"
            checked={settings.webhooksEnabled}
            onCheckedChange={async (v) => { await saveToBackend({ webhooksEnabled: v }) }}
          />
          {settings.webhooksEnabled && (
            <>
              <Separator />
              <SettingRow icon={ExternalLink} label="Webhook URL" description="Endpoint to receive webhook payloads">
                <Input
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  onBlur={async () => { await saveToBackend({ webhookUrl: webhookUrl }) }}
                  className="w-52 h-7 text-xs"
                  placeholder="https://your-server.com/webhook"
                />
              </SettingRow>
            </>
          )}
        </CardContent>
      </Card>

      {/* Third-Party Integrations */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader icon={Plug} title="Third-Party Integrations" description="Connect to POS and CRM systems" />
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleRow
            icon={CreditCard} label="POS Integration"
            description="Connect to your Point of Sale system for F&B charges"
            checked={settings.posIntegration}
            onCheckedChange={async (v) => { await saveToBackend({ posIntegration: v }) }}
          />
          <Separator />
          <ToggleRow
            icon={Users} label="CRM Integration"
            description="Sync guest data with your CRM platform"
            checked={settings.crmIntegration}
            onCheckedChange={async (v) => { await saveToBackend({ crmIntegration: v }) }}
          />
        </CardContent>
      </Card>

      {/* Connected Channels */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader icon={Globe2} title="Connected Channels" description="Status of your OTA and distribution channel connections" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CONNECTED_CHANNELS.map((channel) => (
              <div
                key={channel.name}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <div className={cn('size-3 rounded-full shrink-0', channel.status === 'connected' ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600')} />
                <div className="flex items-center gap-2 min-w-0">
                  <div className={cn('size-6 rounded flex items-center justify-center text-white text-[8px] font-bold shrink-0', channel.color)}>
                    {channel.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{channel.name}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{channel.status}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Security Tab ─────────────────────────────────────────────────────

function SecurityTab() {
  const { user } = useAuthStore()
  const { settings, saveToBackend, resetSettings } = useSettingsStore()
  const [loginTime] = React.useState(() => {
    const now = new Date()
    now.setHours(now.getHours() - 3)
    return now
  })

  // Password change state
  const [currentPassword, setCurrentPassword] = React.useState('')
  const [newPassword, setNewPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [showCurrentPw, setShowCurrentPw] = React.useState(false)
  const [showNewPw, setShowNewPw] = React.useState(false)
  const [showConfirmPw, setShowConfirmPw] = React.useState(false)

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

  const handleResetAll = async () => {
    await resetSettings()
    toast.success('All settings reset to defaults')
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    try {
      await apiFetch('/api/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Password changed. Please sign in again.')
      // Sign out from Supabase — onAuthStateChange clears local state
      setTimeout(async () => {
        try {
          const { createClient } = await import('@/lib/supabase/client')
          await createClient().auth.signOut()
        } catch {
          useAuthStore.getState().logout()
        }
      }, 1500)
    } catch {
      toast.error('Failed to change password. Please try again.')
    }
  }

  const roleColorMap: Record<string, string> = {
    admin: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    gm: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    manager: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    supervisor: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
    staff: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  }
  const roleBadge = roleColorMap[user?.role ?? 'staff'] ?? roleColorMap.staff

  return (
    <div className="space-y-4">
      {/* User Info */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader icon={Users} title="Current User" description="Your account information" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4 py-2">
            <div className={cn('flex size-12 items-center justify-center rounded-full text-white font-semibold text-sm', 'bg-gradient-to-br from-amber-500 to-amber-700')}>
              {(user?.firstName || '').charAt(0)}{(user?.lastName || '').charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">{user?.firstName} {user?.lastName}</p>
                <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 border-0', roleBadge)}>
                  {user?.role?.toUpperCase()}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{user?.position} &mdash; {user?.department}</p>
            </div>
          </div>
          <Separator />
          <InfoRow label="Email" value={user?.email} />
          <Separator />
          <InfoRow label="Role" value={user?.role} badge />
          <Separator />
          <InfoRow label="Department" value={user?.department} />
          <Separator />
          <InfoRow label="Property" value={settings.hotelName} />
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader icon={Lock} title="Change Password" description="Update your account password" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Current Password</Label>
            <div className="relative">
              <Input
                type={showCurrentPw ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="h-9 pr-9"
                placeholder="Enter current password"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowCurrentPw(!showCurrentPw)}
              >
                {showCurrentPw ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">New Password</Label>
            <div className="relative">
              <Input
                type={showNewPw ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-9 pr-9"
                placeholder="Enter new password"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowNewPw(!showNewPw)}
              >
                {showNewPw ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Confirm New Password</Label>
            <div className="relative">
              <Input
                type={showConfirmPw ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-9 pr-9"
                placeholder="Re-enter new password"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowConfirmPw(!showConfirmPw)}
              >
                {showConfirmPw ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
          </div>
          <Button size="sm" onClick={handleChangePassword} className="h-7 text-xs">
            <Key className="size-3.5 mr-1.5" />
            Update Password
          </Button>
        </CardContent>
      </Card>

      {/* Session */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader icon={Timer} title="Session" description="Information about your current session" />
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow label="Last Login" value={loginTime.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} />
          <Separator />
          <InfoRow label="Session Duration" value={sessionDuration} />
          <Separator />
          <SettingRow icon={Timer} label="Auto Logout" description="Automatically sign out after inactivity">
            <Select value={settings.autoLogout} onValueChange={(v) => { saveToBackend({ autoLogout: v }); toast.success('Auto-logout updated') }}>
              <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
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
          <SectionHeader icon={Trash2} title="Data Management" description="Reset and clear local data" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Button
              variant="outline"
              className="text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700 dark:border-amber-800/50 dark:hover:bg-amber-950/50 dark:hover:text-amber-400"
              onClick={handleResetAll}
            >
              <RotateCcw className="size-4 mr-2" />
              Reset All Settings to Defaults
            </Button>
            <p className="text-[11px] text-muted-foreground mt-2">
              This will reset all system settings (tax, policies, payment) to their default values.
            </p>
          </div>
          <Separator />
          <div>
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-800/50 dark:hover:bg-red-950/50 dark:hover:text-red-400"
              onClick={handleClearData}
            >
              <Trash2 className="size-4 mr-2" />
              Clear Local Data & Cache
            </Button>
            <p className="text-[11px] text-muted-foreground mt-2">
              This will clear all locally stored preferences, settings, and cached data. You will need to reconfigure your settings.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Backup & Data Tab ───────────────────────────────────────────────

function BackupTab() {
  const { settings, saveToBackend, resetSettings } = useSettingsStore()

  const [backupInterval, setBackupInterval] = React.useState(settings.autoBackupInterval)
  const [dataRetention, setDataRetention] = React.useState(String(settings.dataRetentionDays))
  const [showConfirmReset, setShowConfirmReset] = React.useState(false)

  React.useEffect(() => {
    setBackupInterval(settings.autoBackupInterval)
    setDataRetention(String(settings.dataRetentionDays))
  }, [settings.autoBackupInterval, settings.dataRetentionDays])

  const lastBackupFormatted = React.useMemo(() => {
    try {
      return new Date(settings.lastBackupDate).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    } catch {
      return 'Never'
    }
  }, [settings.lastBackupDate])

  function escapeCsvField(value: string | number | null | undefined): string {
    const str = String(value ?? '')
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  function downloadCsv(filename: string, csvContent: string) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportData = async (type: string) => {
    try {
      if (type === 'Guest List') {
        const guests = await apiFetch<any[]>('/api/guests')
        const rows: string[][] = [
          ['Name', 'Email', 'Phone', 'VIP', 'Country'],
          ...(guests || []).map((g: any) => [
            g.name || `${g.firstName || ''} ${g.lastName || ''}`.trim(),
            g.email || '',
            g.phone || '',
            g.isVip ? 'Yes' : 'No',
            g.country || '',
          ]),
        ]
        const csvContent = rows.map(r => r.map(escapeCsvField).join(',')).join('\n')
        downloadCsv('guest-list.csv', csvContent)
        toast.success('Guest list exported successfully')
      } else if (type === 'Reservations') {
        const reservations = await apiFetch<any[]>('/api/reservations')
        const rows: string[][] = [
          ['Confirmation #', 'Guest', 'Room', 'Check-in', 'Check-out', 'Status', 'Total'],
          ...(reservations || []).map((r: any) => [
            r.confirmationNo || '',
            r.guestName || `${r.guest?.firstName || ''} ${r.guest?.lastName || ''}`.trim(),
            r.roomNumber || r.room?.number || '',
            r.checkIn || '',
            r.checkOut || '',
            r.status || '',
            String(r.totalAmount ?? r.total ?? 0),
          ]),
        ]
        const csvContent = rows.map(r => r.map(escapeCsvField).join(',')).join('\n')
        downloadCsv('reservations.csv', csvContent)
        toast.success('Reservations exported successfully')
      } else if (type === 'Revenue Report') {
        const report = await apiFetch<any>('/api/front-desk/reports?type=revenue')
        const rows: string[][] = [
          ['Metric', 'Value'],
          ['Total Revenue', String(report.totalRevenue ?? 0)],
          ['Total Paid', String(report.totalPaid ?? 0)],
          ['Outstanding', String(report.outstanding ?? 0)],
          ['Average Rate', String(report.averageRate ?? 0)],
        ]
        const csvContent = rows.map(r => r.map(escapeCsvField).join(',')).join('\n')
        downloadCsv('revenue-report.csv', csvContent)
        toast.success('Revenue report exported successfully')
      }
    } catch (err) {
      toast.error(`Failed to export ${type}: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleResetAllSettings = () => {
    resetSettings()
    setShowConfirmReset(false)
    toast.success('All settings have been reset to defaults')
  }

  return (
    <div className="space-y-4">
      {/* Auto Backup */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader icon={DatabaseBackup} title="Auto Backup" description="Configure automatic database backup settings" />
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleRow
            icon={DatabaseBackup} label="Auto Backup"
            description="Automatically create database backups on schedule"
            checked={settings.autoBackup}
            onCheckedChange={async (v) => { await saveToBackend({ autoBackup: v }) }}
          />
          {settings.autoBackup && (
            <>
              <Separator />
              <SettingRow icon={Timer} label="Backup Frequency" description="How often automatic backups are created">
                <Select value={backupInterval} onValueChange={async (v) => { setBackupInterval(v); await saveToBackend({ autoBackupInterval: v }) }}>
                  <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
            </>
          )}
          <Separator />
          <InfoRow label="Last Backup" value={lastBackupFormatted} />
        </CardContent>
      </Card>

      {/* Data Retention */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader icon={HardDrive} title="Data Retention" description="Manage how long historical data is kept" />
        </CardHeader>
        <CardContent className="space-y-3">
          <SettingRow icon={Timer} label="Data Retention Period" description="Automatically archive data older than this period">
            <Select value={dataRetention} onValueChange={async (v) => { setDataRetention(v); await saveToBackend({ dataRetentionDays: parseInt(v) }) }}>
              <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="180">180 days</SelectItem>
                <SelectItem value="365">365 days</SelectItem>
                <SelectItem value="730">730 days</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
        </CardContent>
      </Card>

      {/* Export Data */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader icon={Download} title="Export Data" description="Download reports and data in various formats" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { label: 'Guest List', desc: 'Export all guest records', icon: Users },
              { label: 'Reservations', desc: 'Export booking history', icon: FileText },
              { label: 'Revenue Report', desc: 'Export financial data', icon: BarChart3 },
            ].map((item) => (
              <button
                key={item.label}
                className="flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-all hover:bg-muted/50"
                onClick={() => handleExportData(item.label)}
              >
                <div className="flex size-10 items-center justify-center rounded-lg bg-muted shrink-0">
                  <item.icon className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone — Reset */}
      <Card className="border-red-200 dark:border-red-800/50">
        <CardHeader className="pb-3">
          <SectionHeader icon={AlertTriangle} title="Danger Zone" description="Irreversible actions — proceed with caution" />
        </CardHeader>
        <CardContent className="space-y-4">
          {!showConfirmReset ? (
            <div>
              <Button
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-800/50 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                onClick={() => setShowConfirmReset(true)}
              >
                <Trash2 className="size-4 mr-2" />
                Reset All Settings
              </Button>
              <p className="text-[11px] text-muted-foreground mt-2">
                This will restore every setting on all tabs to factory defaults. This action cannot be undone.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">
                Are you absolutely sure?
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mb-3">
                All settings across every tab will be reset to their default values. You will lose your current configuration.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleResetAllSettings}
                >
                  <Trash2 className="size-3.5 mr-1.5" />
                  Yes, Reset Everything
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setShowConfirmReset(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── About Tab ────────────────────────────────────────────────────────

function AboutTab() {
  const [storageUsed, setStorageUsed] = React.useState(0)
  const [storageTotal] = React.useState(5120)

  React.useEffect(() => {
    try {
      let total = 0
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) total += localStorage.getItem(key)?.length || 0
      }
      setStorageUsed(Math.round((total * 2) / 1024))
    } catch { setStorageUsed(0) }
  }, [])

  const storagePercent = Math.min(Math.round((storageUsed / storageTotal) * 100), 100)

  return (
    <div className="space-y-4">
      {/* System Info */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader icon={Info} title="System Information" description="Version, license, and support details" />
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow label="System Version" value={<span className="font-mono">Meridian PMS v2.0.0</span>} />
          <Separator />
          <InfoRow label="Build" value={<span className="font-mono">2024.01</span>} />
          <Separator />
          <InfoRow label="License" value={<Badge variant="outline" className="text-[10px]">Property Management System</Badge>} badge />
          <Separator />
          <InfoRow label="Framework" value="Next.js 16 + React 19" />
          <Separator />
          <InfoRow label="Support Contact" value="it@meridian.com" />
          <Separator />
          <InfoRow label="Support Extension" value="ext. 1000" />
        </CardContent>
      </Card>

      {/* System Health */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader icon={Database} title="System Health" description="Database connection and storage status" />
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
              <span className="text-xs text-muted-foreground">{storageUsed} KB / {storageTotal} KB</span>
            </div>
            <Progress value={storagePercent} className="h-2" />
            <p className="text-[11px] text-muted-foreground">
              {storagePercent < 50 ? 'Storage usage is within normal limits.' : storagePercent < 80 ? 'Storage usage is moderate.' : 'Storage usage is high.'}
            </p>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <Globe2 className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">API Gateway</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Active</span>
            </div>
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
                Contact IT support at <span className="font-medium text-foreground">it@meridian.com</span> or extension <span className="font-medium text-foreground">1000</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Nepal Standards Tab ────────────────────────────────────────────────

function NepalStandardsTab() {
  const { preferences, updatePreferences } = usePreferencesStore()
  const ns = preferences.nepaliStandards || {
    dualCalendar: true,
    holidayAlerts: true,
    autoTaxRules: true,
    foreignGuestRegistration: true,
    tourismFee: 500,
    localBodyTaxRate: 0,
  }

  const updateNS = (updates: Partial<typeof ns>) => {
    updatePreferences({ nepaliStandards: { ...ns, ...updates } })
    toast.success('Nepal standards updated')
  }

  return (
    <div className="space-y-4">
      {/* Dual Calendar */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader
            icon={Calendar}
            title="Dual Calendar (AD + BS)"
            description="Show Bikram Sambat dates alongside Gregorian (AD) dates throughout the system"
          />
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleRow
            icon={Calendar}
            label="Enable Dual Calendar"
            description="Display both AD and BS dates in the header, calendar, and reports"
            checked={ns.dualCalendar}
            onCheckedChange={(v) => updateNS({ dualCalendar: v })}
          />
          <Separator />
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1">Preview</p>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              When enabled, dates will appear as: &quot;15/07/2025 | १/०४/२०८२&quot;
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Holiday Alerts */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader
            icon={Bell}
            title="Nepali Holiday Awareness"
            description="Highlight Nepali public holidays on the calendar and warn during bookings"
          />
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleRow
            icon={Bell}
            label="Holiday Alerts"
            description="Highlight Dashain, Tihar, Holi, and other major holidays on the calendar"
            checked={ns.holidayAlerts}
            onCheckedChange={(v) => updateNS({ holidayAlerts: v })}
          />
          <Separator />
          <div className="rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 p-3">
            <p className="text-xs font-semibold text-orange-800 dark:text-orange-300 mb-1">Supported Holidays (18)</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {['New Year', 'Republic Day', 'Dashain', 'Tihar', 'Holi', 'Shivaratri', 'Chhath', 'Saraswati Puja', 'Makar Sankranti', 'Ram Navami'].map((h) => (
                <Badge key={h} variant="outline" className="text-[9px] px-1.5 py-0 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-400">
                  {h}
                </Badge>
              ))}
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-muted-foreground">+8 more</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tax Rules */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader
            icon={Percent}
            title="Nepal Tax Rules"
            description="Auto-apply Nepal-standard tax rates (VAT 13%, Service Charge 10%) to invoices"
          />
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleRow
            icon={Percent}
            label="Auto-Apply Nepal Tax Rules"
            description="Automatically calculate VAT and service charge per Nepal government standards"
            checked={ns.autoTaxRules}
            onCheckedChange={(v) => updateNS({ autoTaxRules: v })}
          />
          <Separator />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SettingRow icon={Landmark} label="Tourism Fee / Night" description="Per-night tourism levy">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Rs.</span>
                <Input
                  type="number"
                  value={String(ns.tourismFee)}
                  onChange={(e) => updateNS({ tourismFee: parseInt(e.target.value) || 0 })}
                  className="w-20 h-7 text-xs text-right"
                  min="0" step="100"
                />
              </div>
            </SettingRow>
            <SettingRow icon={Building} label="Local Body Tax %" description="Municipality tax rate">
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  value={String(ns.localBodyTaxRate)}
                  onChange={(e) => updateNS({ localBodyTaxRate: parseFloat(e.target.value) || 0 })}
                  className="w-20 h-7 text-xs text-right"
                  min="0" max="100" step="0.5"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </SettingRow>
          </div>
        </CardContent>
      </Card>

      {/* Guest Registration */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader
            icon={ShieldCheck}
            title="Foreign Guest Registration"
            description="Nepal requires passport/ID registration for all foreign nationals"
          />
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleRow
            icon={ShieldCheck}
            label="Require Passport for Foreign Guests"
            description="Prompt for passport number and nationality during check-in"
            checked={ns.foreignGuestRegistration}
            onCheckedChange={(v) => updateNS({ foreignGuestRegistration: v })}
          />
          <Separator />
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex items-start gap-2">
              <Info className="size-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p>As per Nepal Tourism Board guidelines, all hotels must register foreign guests with their:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-1">
                  <li>Passport number</li>
                  <li>Nationality</li>
                  <li>Visa type and expiry</li>
                  <li>Entry/departure dates</li>
                </ul>
                <p className="mt-1">Transactions exceeding NPR 200,000 in cash must be reported.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Main Settings Module ──────────────────────────────────────────────

const SETTINGS_TABS = [
  { id: 'general', label: 'General', icon: Building2, description: 'Property info & business hours' },
  { id: 'display', label: 'Display', icon: Palette, description: 'Theme, format & layout' },
  { id: 'tax', label: 'Tax & Fees', icon: Percent, description: 'Tax rates & charges' },
  { id: 'policies', label: 'Booking Policies', icon: FileText, description: 'Cancellation & deposit rules' },
  { id: 'payment', label: 'Payment Methods', icon: CreditCard, description: 'Accepted payment types' },
  { id: 'room-defaults', label: 'Room Defaults', icon: BedDouble, description: 'Default room settings' },
  { id: 'nepal-standards', label: 'Nepal Standards', icon: Landmark, description: 'BS calendar, holidays & tax rules' },
  { id: 'email', label: 'Email & Comms', icon: Mail, description: 'SMTP & email templates' },
  { id: 'printing', label: 'Printing & Docs', icon: Printer, description: 'Receipt & invoice format' },
  { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Alert preferences' },
  { id: 'integrations', label: 'Integrations', icon: Plug, description: 'API & channel connections' },
  { id: 'security', label: 'Security', icon: ShieldCheck, description: 'Account & session settings' },
  { id: 'backup', label: 'Backup & Data', icon: DatabaseBackup, description: 'Backup & data management' },
  { id: 'about', label: 'About', icon: Info, description: 'System info & support' },
]

export function SettingsModule() {
  const [activeTab, setActiveTab] = React.useState('general')
  const { settings, _loaded, syncFromBackend } = useSettingsStore()

  // Sync settings from backend on mount
  React.useEffect(() => {
    syncFromBackend()
  }, [])

  const renderContent = () => {
    switch (activeTab) {
      case 'general': return <GeneralTab />
      case 'display': return <DisplayTab />
      case 'tax': return <TaxFeesTab />
      case 'policies': return <BookingPoliciesTab />
      case 'payment': return <PaymentMethodsTab />
      case 'room-defaults': return <RoomDefaultsTab />
      case 'nepal-standards': return <NepalStandardsTab />
      case 'email': return <EmailTab />
      case 'printing': return <PrintingTab />
      case 'notifications': return <NotificationsTab />
      case 'integrations': return <IntegrationsTab />
      case 'security': return <SecurityTab />
      case 'backup': return <BackupTab />
      case 'about': return <AboutTab />
      default: return <GeneralTab />
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Page Header */}
      <div className="shrink-0 flex items-center justify-between px-4 md:px-6 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-sm">
            <Settings className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Settings</h1>
            <p className="text-sm text-muted-foreground">Manage your hotel system configuration and preferences</p>
          </div>
        </div>
      </div>

      {/* Sync status */}
      {!_loaded && (
        <div className="px-4 md:px-6 pb-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="size-3 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
            Syncing settings...
          </div>
        </div>
      )}

      {/* Main Content — Two Column Layout */}
      <div className="flex flex-1 min-h-0 gap-0">
        {/* Left Sidebar — Tab Navigation (scroll only on hover) */}
        <div className="group hidden md:flex flex-col w-60 shrink-0 bg-muted/40 dark:bg-slate-800/40 border-r border-border self-stretch">
          <div className="flex-1 overflow-hidden group-hover:overflow-y-auto transition-[overflow] duration-200 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border/60 group-hover:[&::-webkit-scrollbar-thumb]:bg-border rounded-md">
            <nav className="p-3 space-y-1">
              {SETTINGS_TABS.map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all',
                      isActive
                        ? 'bg-primary/10 text-primary font-medium shadow-sm ring-1 ring-primary/20'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-muted/60 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-slate-100'
                    )}
                  >
                    <div className={cn(
                      'flex size-8 items-center justify-center rounded-lg shrink-0 transition-colors',
                      isActive
                        ? 'bg-primary/15'
                        : 'bg-muted dark:bg-slate-700/50'
                    )}>
                      <tab.icon className={cn('size-4', isActive ? 'text-primary' : 'text-slate-500 dark:text-slate-400')} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm truncate">{tab.label}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{tab.description}</p>
                    </div>
                    {isActive && <ChevronRight className="size-3.5 ml-auto text-primary shrink-0" />}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Mobile Tab Selector */}
        <div className="md:hidden shrink-0 px-4">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SETTINGS_TABS.map((tab) => (
                <SelectItem key={tab.id} value={tab.id}>
                  <span className="flex items-center gap-2">
                    <tab.icon className="size-4" />
                    {tab.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Right Content Area (independently scrollable) */}
        <div className="flex-1 min-w-0 min-h-0 self-stretch">
          <ScrollArea className="h-full">
            <div className="p-4 md:p-6 pb-16 max-w-2xl">
              {renderContent()}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
