'use client'

import * as React from 'react'
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
  Printer, FileDown,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  useAuthStore, usePropertyStore, usePreferencesStore,
  useSettingsStore,
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

// ─── Shared Components ─────────────────────────────────────────────

function SectionHeader({
  icon: Icon, title, description,
}: {
  icon: React.ElementType; title: string; description: string
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

function SettingRow({
  icon, label, description, children,
}: {
  icon?: React.ElementType; label: string; description?: string; children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
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
  const { settings, updateSettings } = useSettingsStore()

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

  const handleSaveField = (field: string, value: string | number) => {
    updateSettings({ [field]: value } as any)
    setActiveProperty({ ...activeProperty, [field]: value })
    toast.success('Setting updated')
  }

  return (
    <div className="space-y-6">
      {/* Property Information */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader icon={Building2} title="Property Information" description="Manage your hotel details and contact information" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Hotel Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => handleSaveField('hotelName', name)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Hotel Code</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} onBlur={() => handleSaveField('hotelCode', code)} className="h-9" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Address</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} onBlur={() => handleSaveField('address', address)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} onBlur={() => handleSaveField('city', city)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Country</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} onBlur={() => handleSaveField('country', country)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} onBlur={() => handleSaveField('phone', phone)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => handleSaveField('email', email)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Website</Label>
              <Input value={website} onChange={(e) => setWebsite(e.target.value)} onBlur={() => handleSaveField('website', website)} className="h-9" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Star Rating</Label>
            <Select value={starRating} onValueChange={(v) => { setStarRating(v); handleSaveField('starRating', parseInt(v)) }}>
              <SelectTrigger className="w-28 h-8 text-xs">
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
            <Select value={checkIn} onValueChange={(v) => { setCheckIn(v); handleSaveField('defaultCheckIn', v) }}>
              <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-48">
                {TIME_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>
          <Separator />
          <SettingRow icon={LogOut} label="Default Check-Out" description="Standard guest departure time">
            <Select value={checkOut} onValueChange={(v) => { setCheckOut(v); handleSaveField('defaultCheckOut', v) }}>
              <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-48">
                {TIME_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>
          <Separator />
          <SettingRow icon={MoonStar} label="Night Audit Time" description="When the daily night audit runs">
            <Select value={nightAudit} onValueChange={(v) => { setNightAudit(v); handleSaveField('nightAuditTime', v) }}>
              <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
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
              <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
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
              <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
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
    <div className="space-y-6">
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
              <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
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
              <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
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
  const { settings, updateSettings } = useSettingsStore()
  const [taxRate, setTaxRate] = React.useState(String(settings.taxRate))
  const [serviceCharge, setServiceCharge] = React.useState(String(settings.serviceCharge))
  const [tourismTax, setTourismTax] = React.useState(String(settings.tourismTax))

  React.useEffect(() => {
    setTaxRate(String(settings.taxRate))
    setServiceCharge(String(settings.serviceCharge))
    setTourismTax(String(settings.tourismTax))
  }, [settings.taxRate, settings.serviceCharge, settings.tourismTax])

  return (
    <div className="space-y-6">
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
                onBlur={() => { updateSettings({ taxRate: parseFloat(taxRate) || 0 }); toast.success('Tax rate updated') }}
                className="w-20 h-8 text-xs text-right"
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
                onBlur={() => { updateSettings({ serviceCharge: parseFloat(serviceCharge) || 0 }); toast.success('Service charge updated') }}
                className="w-20 h-8 text-xs text-right"
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
                onBlur={() => { updateSettings({ tourismTax: parseFloat(tourismTax) || 0 }); toast.success('Tourism tax updated') }}
                className="w-20 h-8 text-xs text-right"
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
  const { settings, updateSettings } = useSettingsStore()

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

  const handleSave = (field: string, value: any) => {
    updateSettings({ [field]: value } as any)
    toast.success('Policy updated')
  }

  return (
    <div className="space-y-6">
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
                className="w-20 h-8 text-xs text-right"
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
                    className="w-20 h-8 text-xs text-right"
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
                className="w-20 h-8 text-xs text-right"
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
                className="w-24 h-8 text-xs text-right"
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
                className="w-24 h-8 text-xs text-right"
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
  const { settings, updateSettings } = useSettingsStore()

  const handleToggleMethod = (field: string, value: boolean) => {
    updateSettings({ [field]: value } as any)
    toast.success('Payment method updated')
  }

  const handleToggleCardType = (type: string, checked: boolean) => {
    const cardTypes = checked
      ? [...settings.cardTypes, type]
      : settings.cardTypes.filter((c) => c !== type)
    updateSettings({ cardTypes })
    toast.success('Card type updated')
  }

  return (
    <div className="space-y-6">
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

// ─── Notifications Tab ────────────────────────────────────────────────

interface NotificationSettings {
  checkInReminders: boolean
  checkOutReminders: boolean
  overbookingAlerts: boolean
  lowStockAlerts: boolean
  paymentReceived: boolean
  nightAuditAlert: boolean
  newReservations: boolean
  maintenanceAlerts: boolean
  shiftHandover: boolean
  hkTaskCompleted: boolean
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
    newReservations: true,
    maintenanceAlerts: true,
    shiftHandover: true,
    hkTaskCompleted: false,
  })

  const masterEnabled = preferences.notifications

  const handleToggle = (key: keyof NotificationSettings, value: boolean) => {
    setNotifSettings((prev) => ({ ...prev, [key]: value }))
    toast.success('Notification updated')
  }

  const handleMasterToggle = (value: boolean) => {
    updatePreferences({ notifications: value })
    toast.success(value ? 'Notifications enabled' : 'Notifications disabled')
  }

  const notifGroups = [
    {
      title: 'Front Desk',
      icon: Hotel,
      items: [
        { key: 'checkInReminders' as const, icon: LogIn, label: 'Check-in Reminders', desc: 'Upcoming guest arrivals' },
        { key: 'checkOutReminders' as const, icon: LogOut, label: 'Check-out Reminders', desc: 'Departing guests and room turnover' },
        { key: 'newReservations' as const, icon: FileText, label: 'New Reservations', desc: 'Incoming booking confirmations' },
      ],
    },
    {
      title: 'Operations',
      icon: Clock,
      items: [
        { key: 'nightAuditAlert' as const, icon: MoonStar, label: 'Night Audit Alert', desc: 'Daily audit reminder' },
        { key: 'shiftHandover' as const, icon: Timer, label: 'Shift Handover', desc: 'Upcoming shift change notifications' },
      ],
    },
    {
      title: 'Housekeeping',
      icon: Users,
      items: [
        { key: 'hkTaskCompleted' as const, icon: CheckCircle2, label: 'Task Completed', desc: 'When a housekeeping task is finished' },
      ],
    },
    {
      title: 'Finance & Inventory',
      icon: CreditCard,
      items: [
        { key: 'paymentReceived' as const, icon: CreditCard, label: 'Payment Received', desc: 'When a payment is recorded' },
        { key: 'overbookingAlerts' as const, icon: AlertTriangle, label: 'Overbooking Alerts', desc: 'Double booking warnings' },
        { key: 'lowStockAlerts' as const, icon: Package, label: 'Low Stock Alerts', desc: 'Inventory below minimum levels' },
      ],
    },
    {
      title: 'Maintenance',
      icon: KeyRound,
      items: [
        { key: 'maintenanceAlerts' as const, icon: AlertTriangle, label: 'Work Order Updates', desc: 'Maintenance task status changes' },
      ],
    },
  ]

  return (
    <div className="space-y-6">
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
      {notifGroups.map((group, idx) => (
        <Card key={group.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <group.icon className="size-4" />
              {group.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {group.items.map((item, i) => (
              <React.Fragment key={item.key}>
                <ToggleRow
                  icon={item.icon} label={item.label} description={item.desc}
                  checked={notifSettings[item.key]}
                  onCheckedChange={(v) => handleToggle(item.key, v)}
                  disabled={!masterEnabled}
                />
                {i < group.items.length - 1 && <Separator />}
              </React.Fragment>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ─── Security Tab ─────────────────────────────────────────────────────

function SecurityTab() {
  const { user } = useAuthStore()
  const [autoLogout, setAutoLogout] = React.useState('30min')
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

  const { resetSettings } = useSettingsStore()
  const handleResetAll = () => {
    resetSettings()
    toast.success('All settings reset to defaults')
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
    <div className="space-y-6">
      {/* User Info */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader icon={Users} title="Current User" description="Your account information" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4 py-2">
            <div className={cn('flex size-12 items-center justify-center rounded-full text-white font-semibold text-sm', 'bg-gradient-to-br from-amber-500 to-amber-700')}>
              {user?.firstName.charAt(0)}{user?.lastName.charAt(0)}
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
          <InfoRow label="Property" value="Meridian Hotel" />
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
            <Select value={autoLogout} onValueChange={(v) => { setAutoLogout(v); toast.success('Auto-logout updated') }}>
              <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
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
    <div className="space-y-6">
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

// ─── Main Settings Module ──────────────────────────────────────────────

const SETTINGS_TABS = [
  { id: 'general', label: 'General', icon: Building2, description: 'Property info & business hours' },
  { id: 'display', label: 'Display', icon: Palette, description: 'Theme, format & layout' },
  { id: 'tax', label: 'Tax & Fees', icon: Percent, description: 'Tax rates & charges' },
  { id: 'policies', label: 'Booking Policies', icon: FileText, description: 'Cancellation & deposit rules' },
  { id: 'payment', label: 'Payment Methods', icon: CreditCard, description: 'Accepted payment types' },
  { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Alert preferences' },
  { id: 'security', label: 'Security', icon: ShieldCheck, description: 'Account & session settings' },
  { id: 'about', label: 'About', icon: Info, description: 'System info & support' },
]

export function SettingsModule() {
  const [activeTab, setActiveTab] = React.useState('general')

  const renderContent = () => {
    switch (activeTab) {
      case 'general': return <GeneralTab />
      case 'display': return <DisplayTab />
      case 'tax': return <TaxFeesTab />
      case 'policies': return <BookingPoliciesTab />
      case 'payment': return <PaymentMethodsTab />
      case 'notifications': return <NotificationsTab />
      case 'security': return <SecurityTab />
      case 'about': return <AboutTab />
      default: return <GeneralTab />
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="flex items-center justify-between px-4 md:px-6 pt-5 pb-2">
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

      {/* Main Content — Two Column Layout */}
      <div className="flex flex-1 min-h-0 px-4 md:px-6 pb-4 md:pb-6 gap-6">
        {/* Left Sidebar — Tab Navigation */}
        <div className="hidden md:block w-56 shrink-0">
          <div className="sticky top-0">
            <nav className="space-y-1">
              {SETTINGS_TABS.map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all',
                      isActive
                        ? 'bg-amber-50 text-amber-900 font-medium shadow-sm dark:bg-amber-950/40 dark:text-amber-200'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    )}
                  >
                    <div className={cn(
                      'flex size-8 items-center justify-center rounded-lg shrink-0 transition-colors',
                      isActive
                        ? 'bg-amber-100 dark:bg-amber-900/60'
                        : 'bg-muted'
                    )}>
                      <tab.icon className={cn('size-4', isActive ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground')} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm truncate">{tab.label}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{tab.description}</p>
                    </div>
                    {isActive && <ChevronRight className="size-4 ml-auto text-amber-600 dark:text-amber-400 shrink-0" />}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Mobile Tab Selector */}
        <div className="md:hidden w-full">
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

        {/* Right Content Area */}
        <div className="flex-1 min-h-0 min-w-0">
          <ScrollArea className="h-full max-h-[calc(100vh-12rem)]">
            <div className="pr-4 max-w-2xl">
              {renderContent()}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
