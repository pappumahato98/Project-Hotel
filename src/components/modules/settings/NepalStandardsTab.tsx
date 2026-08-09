'use client'

import * as React from 'react'
import {
  Calendar, Bell, Percent, ShieldCheck, Landmark, Building, Info, Globe2,
  Clock, Phone, Ruler, MapPin, Calculator, ArrowRightLeft, CheckCircle2,
  AlertTriangle, Copy, ChevronDown, ChevronUp, Zap,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { usePreferencesStore } from '@/lib/store'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  NEPAL_VAT_RATE, NEPAL_TDS_RATES, NEPAL_TOURISM_FEE_DEFAULT,
  NEPAL_TIMEZONE, CURRENCY, NEPAL_FY_START_MONTH_AD, NEPAL_FY_START_DAY_AD,
  formatNPR, formatNPRDevanagari, formatDate, formatDateShort, formatDateISO,
  formatDateAD, formatDateBS, formatDateADBS, formatDateDual, formatDateDualLong,
  formatTime, formatTimeDevanagari, formatDateTime, formatDateTimeADBS,
  formatNPRStyled, formatCurrencyCompact, formatNumber,
  getNepalFiscalYearShort, getNepalFiscalYearLong,
  isValidNepalPhone, formatNepalPhone, getNepalPhoneType,
  sqFtToSqM, sqMToSqFt,
} from '@/lib/nepal-standards'
import {
  adToBS, bsToAD,
  formatBSDateNepali, formatBSDateEnglish, formatBSDateShort,
  getNepaliMonthName, getNepaliMonthEnglish, getNepaliMonthShortEnglish,
  getNepaliHolidays, getBsMonthDays, getBsYearDays, isBsLeapYear,
  toNepaliDigits, getBsDayNameNepali,
  BS_YEAR_MIN, BS_YEAR_MAX,
} from '@/lib/nepali-calendar'
import { NEPAL_PROVINCES, getDistrictsByProvince } from '@/lib/nepal-address'
import { toast } from 'sonner'

// ═══════════════════════════════════════════════════════════════════════
// SHARED SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════

function SectionHeader({ icon: Icon, title, description }: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-9 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 shrink-0">
        <Icon className="size-4.5" />
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold leading-tight">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

function SettingRow({ icon: Icon, label, description, children }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && <Icon className="size-4 text-muted-foreground shrink-0" />}
        <div className="min-w-0">
          <Label className="text-sm font-medium leading-tight">{label}</Label>
          {description && <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function ToggleRow({ icon, label, description, checked, onCheckedChange }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
}) {
  return (
    <SettingRow icon={icon} label={label} description={description}>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </SettingRow>
  )
}

function PreviewBox({ label, children, className }: {
  label?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('rounded-lg border border-border/60 bg-muted/30 p-3', className)}>
      {label && <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{label}</p>}
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function CopyableText({ text }: { text: string }) {
  return (
    <span
      className="cursor-pointer hover:text-primary transition-colors inline-flex items-center gap-1 group"
      onClick={() => {
        navigator.clipboard.writeText(text)
        toast.success('Copied to clipboard')
      }}
    >
      <span className="font-mono text-xs">{text}</span>
      <Copy className="size-3 opacity-0 group-hover:opacity-60 transition-opacity" />
    </span>
  )
}

function CollapsibleSection({ title, icon: Icon, children, defaultOpen = false }: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-2 group"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className="size-4 text-muted-foreground" />}
          <span className="text-sm font-medium">{title}</span>
        </div>
        {open ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
      </button>
      {open && <div className="mt-1">{children}</div>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function NepalStandardsTab() {
  const { preferences, updatePreferences } = usePreferencesStore()
  const ns = preferences.nepaliStandards || {
    dualCalendar: true,
    holidayAlerts: true,
    autoTaxRules: true,
    foreignGuestRegistration: true,
    tourismFee: 500,
    localBodyTaxRate: 0,
    datePrefixStyle: 'ad_bs' as const,
    currencyFormat: 'rs_only' as const,
  }

  const updateNS = (updates: Partial<typeof ns>) => {
    updatePreferences({ nepaliStandards: { ...ns, ...updates } })
    toast.success('Nepal standards updated')
  }

  const now = React.useMemo(() => new Date(), [])
  const bsNow = React.useMemo(() => {
    try { return adToBS(now) } catch { return null }
  }, [now])

  // ─── Date Converter Tool State ───
  const [converterInput, setConverterInput] = React.useState(formatDateISO(now))
  const [converterMode, setConverterMode] = React.useState<'ad2bs' | 'bs2ad'>('ad2bs')
  const [bsInputYear, setBsInputYear] = React.useState(String(bsNow?.year ?? 2082))
  const [bsInputMonth, setBsInputMonth] = React.useState(String(bsNow?.month ?? 1))
  const [bsInputDay, setBsInputDay] = React.useState(String(bsNow?.day ?? 1))

  // ─── Currency Preview Amount ───
  const [previewAmount, setPreviewAmount] = React.useState(150000)

  // ─── Phone Validator State ───
  const [phoneInput, setPhoneInput] = React.useState('9841234567')

  // ─── Area Converter State ───
  const [areaInput, setAreaInput] = React.useState('500')
  const [areaUnit, setAreaUnit] = React.useState<'sqft' | 'sqm'>('sqft')

  // ─── District Lookup State ───
  const [selectedProvince, setSelectedProvince] = React.useState('')

  // ─── Tax Calculator State ───
  const [taxBase, setTaxBase] = React.useState(10000)

  const ad2bsResult = React.useMemo(() => {
    if (converterMode !== 'ad2bs') return null
    try {
      const d = new Date(converterInput + 'T00:00:00')
      if (isNaN(d.getTime())) return null
      const bs = adToBS(d)
      return {
        ad: formatDate(converterInput),
        adShort: formatDateShort(converterInput),
        bsEn: formatBSDateEnglish(bs),
        bsNe: formatBSDateNepali(bs),
        bsShort: formatBSDateShort(bs),
        weekday: d.toLocaleDateString('en-US', { weekday: 'long' }),
        weekdayNe: getBsDayNameNepali(bs.year, bs.month, bs.day),
      }
    } catch { return null }
  }, [converterInput, converterMode])

  const bs2adResult = React.useMemo(() => {
    if (converterMode !== 'bs2ad') return null
    try {
      const y = parseInt(bsInputYear)
      const m = parseInt(bsInputMonth)
      const d = parseInt(bsInputDay)
      if (!y || !m || !d) return null
      const adDate = bsToAD(y, m, d)
      const bs = { year: y, month: m, day: d }
      return {
        bsEn: formatBSDateEnglish(bs),
        bsNe: formatBSDateNepali(bs),
        ad: formatDate(adDate),
        adShort: formatDateShort(adDate),
        adISO: formatDateISO(adDate),
        weekday: adDate.toLocaleDateString('en-US', { weekday: 'long' }),
        weekdayNe: getBsDayNameNepali(y, m, d),
      }
    } catch { return null }
  }, [bsInputYear, bsInputMonth, bsInputDay, converterMode])

  const phoneResult = React.useMemo(() => {
    if (!phoneInput.trim()) return null
    const valid = isValidNepalPhone(phoneInput)
    const formatted = formatNepalPhone(phoneInput)
    const type = getNepalPhoneType(phoneInput)
    return { valid, formatted, type }
  }, [phoneInput])

  const areaResult = React.useMemo(() => {
    const val = parseFloat(areaInput) || 0
    if (areaUnit === 'sqft') {
      return { sqft: val, sqm: sqFtToSqM(val) }
    }
    return { sqft: sqMToSqFt(val), sqm: val }
  }, [areaInput, areaUnit])

  const taxResult = React.useMemo(() => {
    const vat = taxBase * (NEPAL_VAT_RATE / 100)
    const tourismFee = ns.tourismFee
    const localTax = taxBase * (ns.localBodyTaxRate / 100)
    const total = taxBase + vat + localTax
    return { base: taxBase, vat, tourismFee, localTax, total }
  }, [taxBase, ns.tourismFee, ns.localBodyTaxRate])

  const districts = React.useMemo(() => {
    if (!selectedProvince) return []
    return getDistrictsByProvince(selectedProvince)
  }, [selectedProvince])

  const currentFY = React.useMemo(() => getNepalFiscalYearLong(), [])
  const currentFYShort = React.useMemo(() => getNepalFiscalYearShort(), [])

  return (
    <div className="space-y-5">
      {/* ═══ 1. CURRENT DATE/TIME STATUS ═══ */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader
            icon={Clock}
            title="Current Date & Time"
            description={`System timezone: ${NEPAL_TIMEZONE} (UTC+5:45)`}
          />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoRow icon={Calendar} label="Today (AD)" value={formatDateAD(now)} />
            <InfoRow icon={Calendar} label="Today (BS)" value={bsNow ? formatBSDateEnglish(bsNow) : '—'} />
            <InfoRow icon={Calendar} label="Today (Nepali)" value={bsNow ? formatBSDateNepali(bsNow) : '—'} />
            <InfoRow icon={Clock} label="Current Time" value={`${formatTime(now)} / ${formatTimeDevanagari(now)}`} />
          </div>
          <Separator />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <InfoRow icon={Landmark} label="Fiscal Year (BS)" value={currentFY} />
            <InfoRow icon={Globe2} label="FY Short" value={currentFYShort} />
            <InfoRow icon={Zap} label="FY Starts" value={`${NEPAL_FY_START_MONTH_AD === 7 ? 'July' : ''} ${NEPAL_FY_START_DAY_AD} AD (Shrawan 1 BS)`} />
          </div>
        </CardContent>
      </Card>

      {/* ═══ 2. DATE FORMAT SETTINGS ═══ */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader
            icon={Calendar}
            title="Date & Calendar"
            description="Control how dates are displayed throughout the system"
          />
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleRow
            icon={Calendar}
            label="Enable Dual Calendar"
            description="Show Bikram Sambat dates alongside Gregorian (AD) dates"
            checked={ns.dualCalendar}
            onCheckedChange={(v) => updateNS({ dualCalendar: v })}
          />
          <Separator />
          <SettingRow
            icon={Globe2}
            label="Date Prefix Style"
            description="Choose which calendar era to show as prefix"
          >
            <Select
              value={ns.datePrefixStyle}
              onValueChange={(v) => updateNS({ datePrefixStyle: v as typeof ns.datePrefixStyle })}
            >
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ad_bs">AD + BS</SelectItem>
                <SelectItem value="ad_only">AD Only</SelectItem>
                <SelectItem value="bs_only">BS Only</SelectItem>
                <SelectItem value="none">No Prefix</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
          <Separator />
          <PreviewBox label="Live Preview — Today's Date">
            <DatePreviewRow label="AD Only" value={formatDateAD(now)} />
            <DatePreviewRow label="BS Only" value={formatDateBS(now)} />
            <DatePreviewRow label="AD | BS Dual" value={formatDateADBS(now)} />
            <DatePreviewRow label="Dual (Short)" value={formatDateDual(now)} />
            <DatePreviewRow label="Dual (Long)" value={formatDateDualLong(now)} />
            <DatePreviewRow label="Date + Time" value={formatDateTime(now)} />
            <DatePreviewRow label="DateTime + AD|BS" value={formatDateTimeADBS(now)} />
            <DatePreviewRow label="ISO Format" value={formatDateISO(now)} />
            {bsNow && <DatePreviewRow label="Nepali Script" value={formatBSDateNepali(bsNow)} />}
          </PreviewBox>
        </CardContent>
      </Card>

      {/* ═══ 3. CURRENCY FORMAT SETTINGS ═══ */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader
            icon={Landmark}
            title="Currency & Number Formatting"
            description={`${CURRENCY.name} (${CURRENCY.code}) — Indian/Nepali lakh/crore grouping`}
          />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoRow icon={Landmark} label="Currency Code" value={CURRENCY.code} />
            <InfoRow icon={Landmark} label="Currency Name" value={CURRENCY.name} />
          </div>
          <Separator />
          <SettingRow
            icon={Percent}
            label="Currency Display Style"
            description="Choose how amounts appear in the system"
          >
            <Select
              value={ns.currencyFormat}
              onValueChange={(v) => updateNS({ currencyFormat: v as typeof ns.currencyFormat })}
            >
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rs_only">Rs. ... Only</SelectItem>
                <SelectItem value="npr_only">NPR ... Only</SelectItem>
                <SelectItem value="ru_matra">रू ... मात्र</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
          <Separator />
          <SettingRow
            icon={Calculator}
            label="Preview Amount"
            description="Enter an amount to see all formatting variants"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Rs.</span>
              <Input
                type="number"
                value={previewAmount}
                onChange={(e) => setPreviewAmount(parseInt(e.target.value) || 0)}
                className="w-28 h-7 text-xs text-right"
                min="0" step="1000"
              />
            </div>
          </SettingRow>
          <PreviewBox label="Currency Format Previews">
            <DatePreviewRow label="Rs. Style" value={formatNPR(previewAmount)} />
            <DatePreviewRow label="NPR Code" value={formatNPR(previewAmount, { showCode: true })} />
            <DatePreviewRow label="रू Devanagari" value={formatNPRDevanagari(previewAmount)} />
            <DatePreviewRow label="No Suffix" value={formatNPR(previewAmount, { noSuffix: true })} />
            <DatePreviewRow label="Compact" value={formatCurrencyCompact(previewAmount)} />
            <DatePreviewRow label="Styled (Active)" value={formatNPRStyled(previewAmount, ns.currencyFormat)} />
            <DatePreviewRow label="Number Only" value={formatNumber(previewAmount)} />
            <DatePreviewRow label="Time Devanagari" value={formatTimeDevanagari(now)} />
          </PreviewBox>
        </CardContent>
      </Card>

      {/* ═══ 4. TAX & FISCAL RULES ═══ */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader
            icon={Percent}
            title="Nepal Tax Rules"
            description="VAT, TDS, tourism fees, and fiscal year configuration"
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
          <Separator />

          {/* TDS Reference Table */}
          <CollapsibleSection title="TDS Rate Reference (Nepal Government)" icon={Percent} defaultOpen={false}>
            <div className="rounded-lg border border-border/60 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-3 py-2 font-medium">Category</th>
                    <th className="text-right px-3 py-2 font-medium">TDS Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {Object.entries(NEPAL_TDS_RATES).map(([key, rate]) => (
                    <tr key={key} className="hover:bg-muted/20">
                      <td className="px-3 py-1.5 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</td>
                      <td className="px-3 py-1.5 text-right font-mono">{rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CollapsibleSection>
          <Separator />

          {/* Tax Calculator */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calculator className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">Tax Calculator Preview</span>
            </div>
            <SettingRow icon={Landmark} label="Base Amount" description="">
              <Input
                type="number"
                value={taxBase}
                onChange={(e) => setTaxBase(parseInt(e.target.value) || 0)}
                className="w-28 h-7 text-xs text-right"
                min="0"
              />
            </SettingRow>
            <div className="rounded-lg bg-muted/30 border border-border/60 p-3 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Base Amount</span>
                <span className="font-mono">{formatNPR(taxResult.base)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">VAT ({NEPAL_VAT_RATE}%)</span>
                <span className="font-mono">{formatNPR(taxResult.vat)}</span>
              </div>
              {ns.localBodyTaxRate > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Local Body Tax ({ns.localBodyTaxRate}%)</span>
                  <span className="font-mono">{formatNPR(taxResult.localTax)}</span>
                </div>
              )}
              {ns.tourismFee > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Tourism Fee / night</span>
                  <span className="font-mono">{formatNPR(taxResult.tourismFee)}</span>
                </div>
              )}
              <Separator className="my-1" />
              <div className="flex justify-between text-xs font-semibold">
                <span>Total (Base + VAT + Local Tax)</span>
                <span className="font-mono text-primary">{formatNPR(taxResult.total)}</span>
              </div>
              <div className="flex justify-between text-xs text-amber-600 dark:text-amber-400">
                <span>Devanagari</span>
                <span className="font-mono">{formatNPRDevanagari(taxResult.total)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══ 5. NEPALI HOLIDAYS ═══ */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader
            icon={Bell}
            title="Nepali Holiday Calendar"
            description="Nepal public holidays based on Bikram Sambat calendar"
          />
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleRow
            icon={Bell}
            label="Holiday Alerts"
            description="Highlight Dashain, Tihar, Holi, and other major holidays"
            checked={ns.holidayAlerts}
            onCheckedChange={(v) => updateNS({ holidayAlerts: v })}
          />
          <Separator />
          <CollapsibleSection title={`All Public Holidays (${NEPAL_PROVINCES.length > 0 ? '21' : '20'} days)`} icon={Bell} defaultOpen={false}>
            <div className="rounded-lg border border-border/60 overflow-hidden max-h-72 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/90 backdrop-blur-sm">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">BS Date</th>
                    <th className="text-left px-3 py-2 font-medium">Nepali</th>
                    <th className="text-left px-3 py-2 font-medium">English</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {getNepaliHolidays(bsNow?.year ?? 2082).map((h, i) => (
                    <tr key={i} className="hover:bg-muted/20">
                      <td className="px-3 py-1.5 font-mono">
                        {String(h.bsMonth).padStart(2, '0')}/{String(h.bsDay).padStart(2, '0')}
                      </td>
                      <td className="px-3 py-1.5" dir="ltr">{h.name}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{h.nameEn}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CollapsibleSection>
          <Separator />
          <PreviewBox label="BS Month Lengths (Current Year)">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <div key={m} className="flex items-center justify-between text-xs bg-background rounded px-2 py-1">
                  <span className="text-muted-foreground truncate">{getNepaliMonthShortEnglish(m)}</span>
                  <span className="font-mono font-medium">
                    {bsNow ? getBsMonthDays(bsNow.year, m) : '—'}
                  </span>
                </div>
              ))}
            </div>
            {bsNow && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-[10px]">
                  {isBsLeapYear(bsNow.year) ? '366 days (Leap)' : '365 days'}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  Year {bsNow.year} has {getBsYearDays(bsNow.year)} days
                </span>
              </div>
            )}
          </PreviewBox>
        </CardContent>
      </Card>

      {/* ═══ 6. DATE CONVERTER TOOL ═══ */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader
            icon={ArrowRightLeft}
            title="AD ↔ BS Date Converter"
            description="Convert dates between Gregorian (AD) and Bikram Sambat (BS)"
          />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={converterMode === 'ad2bs' ? 'default' : 'outline'}
              onClick={() => setConverterMode('ad2bs')}
              className="h-7 text-xs"
            >
              AD → BS
            </Button>
            <Button
              size="sm"
              variant={converterMode === 'bs2ad' ? 'default' : 'outline'}
              onClick={() => setConverterMode('bs2ad')}
              className="h-7 text-xs"
            >
              BS → AD
            </Button>
          </div>

          {converterMode === 'ad2bs' ? (
            <>
              <SettingRow icon={Calendar} label="AD Date" description="Enter a Gregorian date">
                <Input
                  type="date"
                  value={converterInput}
                  onChange={(e) => setConverterInput(e.target.value)}
                  className="w-36 h-8 text-xs"
                />
              </SettingRow>
              {ad2bsResult && (
                <PreviewBox label="Conversion Result">
                  <DatePreviewRow label="AD Full" value={ad2bsResult.ad} />
                  <DatePreviewRow label="AD Short" value={ad2bsResult.adShort} />
                  <DatePreviewRow label="BS English" value={ad2bsResult.bsEn} />
                  <DatePreviewRow label="BS Nepali" value={ad2bsResult.bsNe} />
                  <DatePreviewRow label="BS Short" value={ad2bsResult.bsShort} />
                  <DatePreviewRow label="Day (EN)" value={ad2bsResult.weekday} />
                  <DatePreviewRow label="Day (NE)" value={ad2bsResult.weekdayNe} />
                </PreviewBox>
              )}
            </>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">BS Year</Label>
                  <Input
                    type="number"
                    value={bsInputYear}
                    onChange={(e) => setBsInputYear(e.target.value)}
                    className="h-8 text-xs"
                    min={BS_YEAR_MIN} max={BS_YEAR_MAX}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Month (1-12)</Label>
                  <Select value={bsInputMonth} onValueChange={setBsInputMonth}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <SelectItem key={m} value={String(m)}>
                          {m} — {getNepaliMonthShortEnglish(m)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Day</Label>
                  <Input
                    type="number"
                    value={bsInputDay}
                    onChange={(e) => setBsInputDay(e.target.value)}
                    className="h-8 text-xs"
                    min="1" max="32"
                  />
                </div>
              </div>
              {bs2adResult && (
                <PreviewBox label="Conversion Result">
                  <DatePreviewRow label="BS English" value={bs2adResult.bsEn} />
                  <DatePreviewRow label="BS Nepali" value={bs2adResult.bsNe} />
                  <DatePreviewRow label="AD Full" value={bs2adResult.ad} />
                  <DatePreviewRow label="AD Short" value={bs2adResult.adShort} />
                  <DatePreviewRow label="AD ISO" value={bs2adResult.adISO} />
                  <DatePreviewRow label="Day (EN)" value={bs2adResult.weekday} />
                  <DatePreviewRow label="Day (NE)" value={bs2adResult.weekdayNe} />
                </PreviewBox>
              )}
            </>
          )}
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Info className="size-3" />
            <span>Supported range: BS {BS_YEAR_MIN}–{BS_YEAR_MAX} ({NEPAL_TDS_RATES.salary > 0 ? '' : ''})</span>
          </div>
        </CardContent>
      </Card>

      {/* ═══ 7. PHONE VALIDATOR TOOL ═══ */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader
            icon={Phone}
            title="Nepal Phone Validator"
            description="Validate and format Nepal mobile and landline numbers"
          />
        </CardHeader>
        <CardContent className="space-y-3">
          <SettingRow icon={Phone} label="Phone Number" description="Enter a Nepal phone number">
            <Input
              type="tel"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="9841234567"
              className="w-36 h-8 text-xs"
            />
          </SettingRow>
          {phoneResult && (
            <PreviewBox label="Validation Result">
              <div className="flex items-center gap-2">
                {phoneResult.valid ? (
                  <CheckCircle2 className="size-4 text-green-600" />
                ) : (
                  <AlertTriangle className="size-4 text-red-500" />
                )}
                <span className={cn(
                  'text-xs font-medium',
                  phoneResult.valid ? 'text-green-600' : 'text-red-500'
                )}>
                  {phoneResult.valid ? 'Valid Nepal Number' : 'Invalid Nepal Number'}
                </span>
                {phoneResult.valid && (
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {phoneResult.type}
                  </Badge>
                )}
              </div>
              {phoneResult.valid && (
                <div className="mt-1.5 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Formatted</span>
                    <CopyableText text={phoneResult.formatted} />
                  </div>
                </div>
              )}
            </PreviewBox>
          )}
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Info className="size-3" />
            <span>Accepts: +977-98XXXXXXXX, 97798XXXXXXXX, 98XXXXXXXX, 01-XXXXXXX</span>
          </div>
        </CardContent>
      </Card>

      {/* ═══ 8. AREA CONVERTER ═══ */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader
            icon={Ruler}
            title="Area Converter (sq ft ↔ sq m)"
            description="Convert between square feet and square meters"
          />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={areaUnit === 'sqft' ? 'default' : 'outline'}
              onClick={() => setAreaUnit('sqft')}
              className="h-7 text-xs"
            >
              sq ft → sq m
            </Button>
            <Button
              size="sm"
              variant={areaUnit === 'sqm' ? 'default' : 'outline'}
              onClick={() => setAreaUnit('sqm')}
              className="h-7 text-xs"
            >
              sq m → sq ft
            </Button>
          </div>
          <SettingRow
            icon={Ruler}
            label={areaUnit === 'sqft' ? 'Square Feet' : 'Square Meters'}
            description=""
          >
            <Input
              type="number"
              value={areaInput}
              onChange={(e) => setAreaInput(e.target.value)}
              className="w-28 h-8 text-xs text-right"
              min="0"
            />
          </SettingRow>
          <PreviewBox label="Conversion Result">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Square Feet</span>
              <span className="font-mono">{formatNumber(areaResult.sqft)} sq ft</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Square Meters</span>
              <span className="font-mono">{areaResult.sqm.toFixed(2)} sq m</span>
            </div>
          </PreviewBox>
        </CardContent>
      </Card>

      {/* ═══ 9. PROVINCES & DISTRICTS ═══ */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader
            icon={MapPin}
            title="Provinces & Districts"
            description="Nepal's 7 provinces and 77 districts"
          />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <InfoRow icon={MapPin} label="Total Provinces" value="7" />
            <InfoRow icon={MapPin} label="Total Districts" value="77" />
          </div>
          <Separator />
          <SettingRow icon={MapPin} label="Select Province" description="View districts within a province">
            <Select value={selectedProvince} onValueChange={setSelectedProvince}>
              <SelectTrigger className="w-44 h-8 text-xs">
                <SelectValue placeholder="Choose province..." />
              </SelectTrigger>
              <SelectContent>
                {NEPAL_PROVINCES.map((p) => (
                  <SelectItem key={p.id} value={p.name}>
                    <span className="flex items-center gap-2">
                      <span>Province {p.id}</span>
                      <span className="text-muted-foreground">— {p.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>
          {selectedProvince && (
            <>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="size-3" />
                <span>Capital: {NEPAL_PROVINCES.find(p => p.name === selectedProvince)?.capital ?? '—'}</span>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Districts ({districts.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {districts.map((d, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] font-normal">
                      {typeof d === 'string' ? d : d.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
          <CollapsibleSection title="All Districts Quick Reference" icon={MapPin} defaultOpen={false}>
            <div className="max-h-64 overflow-y-auto space-y-3">
              {NEPAL_PROVINCES.map((province) => (
                <div key={province.id}>
                  <p className="text-xs font-medium mb-1">
                    Province {province.id}: {province.name}
                    <span className="text-muted-foreground font-normal ml-1">
                      ({province.districts.length} districts)
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-1 ml-2">
                    {province.districts.map((d, i) => (
                      <Badge key={i} variant="secondary" className="text-[9px] font-normal">
                        {typeof d === 'string' ? d : d.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        </CardContent>
      </Card>

      {/* ═══ 10. FOREIGN GUEST REGISTRATION ═══ */}
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

      {/* ═══ 11. SYSTEM INFO ═══ */}
      <Card>
        <CardHeader className="pb-3">
          <SectionHeader
            icon={Info}
            title="Nepal Standards System Info"
            description="Technical details about the Nepal standards implementation"
          />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoRow icon={Globe2} label="Timezone" value={NEPAL_TIMEZONE} />
            <InfoRow icon={Globe2} label="UTC Offset" value="UTC+5:45" />
            <InfoRow icon={Landmark} label="VAT Rate" value={`${NEPAL_VAT_RATE}%`} />
            <InfoRow icon={Calendar} label="BS Calendar Range" value={`${BS_YEAR_MIN}–${BS_YEAR_MAX}`} />
            <InfoRow icon={Landmark} label="Default Tourism Fee" value={formatNPR(NEPAL_TOURISM_FEE_DEFAULT)} />
            <InfoRow icon={MapPin} label="Provinces" value="7" />
            <InfoRow icon={MapPin} label="Districts" value="77" />
            <InfoRow icon={Percent} label="TDS Categories" value={String(Object.keys(NEPAL_TDS_RATES).length)} />
          </div>
          <Separator />
          <PreviewBox label="Nepali Months Reference">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <div key={m} className="flex items-center gap-2 text-xs bg-background rounded px-2 py-1">
                  <span className="font-mono text-muted-foreground w-4">{m}</span>
                  <span>{getNepaliMonthEnglish(m)}</span>
                </div>
              ))}
            </div>
          </PreviewBox>
          <PreviewBox label="Nepali Months (Devanagari)">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <div key={m} className="flex items-center gap-2 text-xs bg-background rounded px-2 py-1">
                  <span className="font-mono text-muted-foreground w-4">{toNepaliDigits(m)}</span>
                  <span>{getNepaliMonthName(m)}</span>
                </div>
              ))}
            </div>
          </PreviewBox>
        </CardContent>
      </Card>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════

function InfoRow({ icon: Icon, label, value }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <Icon className="size-3.5 text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground min-w-0 truncate">{label}</span>
      <span className="text-xs font-medium ml-auto text-right truncate">{value}</span>
    </div>
  )
}

function DatePreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <CopyableText text={value} />
    </div>
  )
}
