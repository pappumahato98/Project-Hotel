'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  adToBS,
  formatBSDateNepali,
  formatBSDateEnglish,
  formatBSDateShort,
  getNepaliDayNameShort,
  getNepaliMonthShortEnglish,
  isNepaliHoliday,
} from '@/lib/nepali-calendar'

// ─── Dual Calendar Display Component ────────────────────────────────────
// Shows both AD (Gregorian) and BS (Bikram Sambat) dates

interface DualCalendarDisplayProps {
  date: Date | string
  showBS?: boolean
  showAD?: boolean
  showDayName?: boolean
  showNepaliDay?: boolean
  showHoliday?: boolean
  variant?: 'full' | 'compact' | 'badge'
  className?: string
}

export function DualCalendarDisplay({
  date,
  showBS = true,
  showAD = true,
  showDayName = false,
  showNepaliDay = false,
  showHoliday = false,
  variant = 'full',
  className,
}: DualCalendarDisplayProps) {
  const dateObj = React.useMemo(() => {
    const d = typeof date === 'string' ? new Date(date) : date
    d.setHours(0, 0, 0, 0)
    return d
  }, [date])

  const bs = React.useMemo(() => adToBS(dateObj), [dateObj])
  const holiday = React.useMemo(() => isNepaliHoliday(dateObj), [dateObj])

  // AD formatted strings
  const adDay = dateObj.getDate()
  const adMonth = dateObj.toLocaleDateString('en-GB', { month: 'short' })
  const adYear = dateObj.getFullYear()
  const adDayName = dateObj.toLocaleDateString('en-GB', { weekday: 'short' })

  // BS formatted strings
  const bsNepali = formatBSDateNepali(bs)
  const bsEnglish = formatBSDateEnglish(bs)
  const bsShort = formatBSDateShort(bs)
  const bsMonthShort = getNepaliMonthShortEnglish(bs.month)
  const nepaliDayName = getNepaliDayNameShort(dateObj)

  // ─── Full Variant ───────────────────────────────────────────────────────
  if (variant === 'full') {
    return (
      <div className={cn('space-y-0.5', className)}>
        {showAD && (
          <div className="text-sm">
            {showDayName && (
              <span className="text-muted-foreground mr-1.5">{adDayName},</span>
            )}
            <span className="font-medium">{adDay} {adMonth} {adYear}</span>
            <span className="text-muted-foreground ml-1">(AD)</span>
          </div>
        )}
        {showBS && (
          <div className="text-sm">
            {showNepaliDay && (
              <span className="text-muted-foreground mr-1.5">{nepaliDayName},</span>
            )}
            <span className="font-medium text-amber-700 dark:text-amber-400">{bsNepali}</span>
            <span className="text-muted-foreground ml-1">(BS)</span>
          </div>
        )}
        {showHoliday && holiday.isHoliday && (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="inline-block size-2 rounded-full bg-orange-500" />
            <span className="text-xs font-medium text-orange-700 dark:text-orange-400">
              {holiday.nameEn}
            </span>
          </div>
        )}
      </div>
    )
  }

  // ─── Compact Variant ────────────────────────────────────────────────────
  if (variant === 'compact') {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn('flex items-center gap-1.5 text-xs cursor-default', className)}>
              {showAD && (
                <span className="text-slate-600 dark:text-slate-400">
                  {adDay}/{adMonth}/{adYear}
                </span>
              )}
              {showAD && showBS && (
                <span className="text-muted-foreground">|</span>
              )}
              {showBS && (
                <span className="text-amber-700 dark:text-amber-400 font-medium">
                  {bs.day} {bsMonthShort} {bs.year}
                </span>
              )}
              {showHoliday && holiday.isHoliday && (
                <span className="inline-block size-1.5 rounded-full bg-orange-500 ml-0.5" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs max-w-xs">
            <div className="space-y-1">
              <p className="font-medium">{adDayName}, {adDay} {adMonth} {adYear} (AD)</p>
              {showBS && <p className="text-amber-600 dark:text-amber-400">{bsNepali} (BS)</p>}
              {showBS && <p className="text-muted-foreground">{bsEnglish}</p>}
              {holiday.isHoliday && (
                <p className="text-orange-600 dark:text-orange-400 font-medium">🎉 {holiday.nameEn}</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // ─── Badge Variant ─────────────────────────────────────────────────────
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center gap-1.5', className)}>
            {showAD && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-normal">
                {adDay} {adMonth}
              </Badge>
            )}
            {showBS && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-5 font-normal border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30"
              >
                {bs.day} {bsShort.split(' ')[1]}
              </Badge>
            )}
            {showHoliday && holiday.isHoliday && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-5 font-normal border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30"
              >
                🎉
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{adDayName}, {adDay} {adMonth} {adYear} (AD)</p>
            {showBS && <p className="text-amber-600 dark:text-amber-400">{bsNepali} (BS)</p>}
            {showBS && <p className="text-muted-foreground">{bsEnglish}</p>}
            {holiday.isHoliday && (
              <p className="text-orange-600 dark:text-orange-400 font-medium">🎉 {holiday.nameEn}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}


