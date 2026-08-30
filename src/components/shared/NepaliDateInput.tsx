import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { useLocalizationSettings } from "@/hooks/useSettings";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  adToBS,
  bsToAD,
  formatBSDate,
  getBSMonthName,
  getDaysInBSMonth,
  todayBS,
  type NepaliDate,
} from "@/lib/nepaliDate";
import { getHoliday } from "@/lib/holidays";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface NepaliDateInputProps {
  /** ISO string value (YYYY-MM-DD) in AD */
  value: string;
  /** Callback with AD ISO string */
  onChange: (adIsoDate: string) => void;
  /** Label text */
  label?: string;
  /** Additional className */
  className?: string;
  /** Show both AD and BS inputs side by side */
  showDual?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Hide the internal AD/BS mode caption above picker */
  hideModeLabel?: boolean;
}

export function NepaliDateInput({
  value,
  onChange,
  label,
  className,
  showDual = true,
  disabled = false,
  hideModeLabel = false,
}: NepaliDateInputProps) {
  const { data: locSettings } = useLocalizationSettings();
  const calendarMode = locSettings?.calendar_mode || "AD";
  const effectiveShowDual = showDual && calendarMode === "BS";

  const todayISO = new Date().toISOString().slice(0, 10);
  const bsDate = useMemo(() => {
    if (!value) return todayBS();
    const [y, m, d] = value.split("-").map(Number);
    return adToBS(new Date(y, m - 1, d));
  }, [value]);

  const [bsYear, setBsYear] = useState(bsDate.year);
  const [bsMonth, setBsMonth] = useState(bsDate.month);
  const [bsDay, setBsDay] = useState(bsDate.day);
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    setBsYear(bsDate.year);
    setBsMonth(bsDate.month);
    setBsDay(bsDate.day);
  }, [bsDate.year, bsDate.month, bsDate.day]);

  const handleBSChange = (year: number, month: number, day: number) => {
    const clamped = Math.min(day, getDaysInBSMonth(year, month));
    const adDate = bsToAD({ year, month, day: clamped });
    const iso = `${adDate.getFullYear()}-${String(adDate.getMonth() + 1).padStart(2, "0")}-${String(adDate.getDate()).padStart(2, "0")}`;
    onChange(iso);
  };

  const handleADChange = (adIso: string) => {
    onChange(adIso);
  };

  const bsFormatted = formatBSDate(bsDate, "short");
  const daysInMonth = getDaysInBSMonth(bsYear, bsMonth);

  // Calendar grid generation
  const calendarDays = useMemo(() => {
    const firstDayAD = bsToAD({ year: bsYear, month: bsMonth, day: 1 });
    const startDayOfWeek = firstDayAD.getDay(); // 0=Sun
    const firstDayPref = locSettings?.first_day_of_week ?? 0; // 0=Sun, 1=Mon

    // Adjust start offset based on preference
    // If startDayOfWeek is 0 (Sun) and firstDayPref is 1 (Mon), offset should be 6
    // If startDayOfWeek is 1 (Mon) and firstDayPref is 1 (Mon), offset should be 0
    let offset = (startDayOfWeek - firstDayPref + 7) % 7;

    const days: (number | null)[] = [];
    for (let i = 0; i < offset; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [bsYear, bsMonth, daysInMonth, locSettings?.first_day_of_week]);

  const weekDays = useMemo(() => {
    const baseDays = [
      { id: 0, en: "Su", np: "आइत" },
      { id: 1, en: "Mo", np: "सोम" },
      { id: 2, en: "Tu", np: "मंगल" },
      { id: 3, en: "We", np: "बुध" },
      { id: 4, en: "Th", np: "बिही" },
      { id: 5, en: "Fr", np: "शुक्र" },
      { id: 6, en: "Sa", np: "शनि" },
    ];
    const firstDayPref = locSettings?.first_day_of_week ?? 0;
    const sorted = [...baseDays];
    for (let i = 0; i < firstDayPref; i++) {
      const day = sorted.shift();
      if (day) sorted.push(day);
    }
    return sorted;
  }, [locSettings?.first_day_of_week]);

  const today = todayBS();
  const isToday = (d: number) => d === today.day && bsMonth === today.month && bsYear === today.year;
  const isSelected = (d: number) => d === bsDate.day && bsMonth === bsDate.month && bsYear === bsDate.year;
  const isFuture = (d: number) => {
    if (bsYear > today.year) return true;
    if (bsYear === today.year && bsMonth > today.month) return true;
    if (bsYear === today.year && bsMonth === today.month && d > today.day) return true;
    return false;
  };

  const navigateMonth = (delta: number) => {
    let newMonth = bsMonth + delta;
    let newYear = bsYear;
    if (newMonth > 12) { newMonth = 1; newYear++; }
    if (newMonth < 1) { newMonth = 12; newYear--; }
    setBsMonth(newMonth);
    setBsYear(newYear);
  };

  // BS year range
  const yearRange = Array.from({ length: 20 }, (_, i) => todayBS().year - 5 + i);

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label className="text-xs font-medium">{label}</Label>}
      
      <div className={cn("flex gap-2", effectiveShowDual ? "flex-col sm:flex-row" : "")}>
        {/* AD Date Input */}
        {effectiveShowDual && (
          <div className="flex-1 space-y-1">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">AD Date</span>
            <Input
              type="date"
              value={value}
              max={todayISO}
              onChange={(e) => handleADChange(e.target.value)}
              disabled={disabled}
              className="h-9 text-sm"
            />
          </div>
        )}

        {/* BS Date Input with Calendar Picker */}
        <div className="flex-1 space-y-1">
          {!hideModeLabel && (
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              {calendarMode === "BS" ? (effectiveShowDual ? "BS मिति" : "मिति (BS)") : "Date (AD)"}
            </span>
          )}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                disabled={disabled}
                className={cn(
                  "w-full justify-start text-left font-normal h-9 text-sm",
                  !value && "text-muted-foreground"
                )}
              >
                <Calendar className="mr-2 h-3.5 w-3.5 text-primary" />
                <span className="text-primary font-medium">{bsFormatted}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
              <div className="p-3 space-y-3">
                {/* Month/Year Selectors */}
                <div className="flex items-center justify-between gap-2">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateMonth(-1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-1.5">
                    <Select value={String(bsMonth)} onValueChange={(v) => setBsMonth(Number(v))}>
                      <SelectTrigger className="h-7 w-[110px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                          <SelectItem key={m} value={String(m)} className="text-xs">
                            {getBSMonthName(m)} ({getBSMonthName(m, "np")})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={String(bsYear)} onValueChange={(v) => setBsYear(Number(v))}>
                      <SelectTrigger className="h-7 w-[80px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {yearRange.map((y) => (
                          <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateMonth(1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Day Grid */}
                <div className="grid grid-cols-7 gap-0.5 text-center">
                  {weekDays.map((d) => (
                    <div key={d.id} className="text-[10px] font-medium text-muted-foreground py-1">
                      {locSettings?.language === "np" ? d.np : d.en}
                    </div>
                  ))}
                  {calendarDays.map((day, idx) => {
                    const holiday = day ? getHoliday(bsMonth, day) : null;
                    return (
                      <div key={idx} className="aspect-square flex items-center justify-center">
                        {day ? (
                          <Tooltip delayDuration={300}>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                disabled={isFuture(day)}
                                onClick={() => {
                                  handleBSChange(bsYear, bsMonth, day);
                                  setCalendarOpen(false);
                                }}
                                className={cn(
                                  "h-7 w-7 rounded-md text-xs font-medium transition-colors relative",
                                  isFuture(day)
                                    ? "text-muted-foreground/40 cursor-not-allowed"
                                    : isSelected(day)
                                    ? "bg-primary text-primary-foreground"
                                    : isToday(day)
                                    ? "bg-accent text-accent-foreground font-bold"
                                    : holiday
                                    ? "bg-destructive/10 text-destructive font-bold"
                                    : "hover:bg-secondary text-foreground"
                                )}
                              >
                                {day}
                                {holiday && (
                                  <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-destructive" />
                                )}
                              </button>
                            </TooltipTrigger>
                            {holiday && (
                              <TooltipContent side="top" className="text-[10px] p-2">
                                <p className="font-bold">{locSettings?.language === "np" ? holiday.name_np : holiday.name}</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                {/* Today Button */}
                <div className="flex justify-center pt-1 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-primary"
                    onClick={() => {
                      const t = todayBS();
                      handleBSChange(t.year, t.month, t.day);
                      setCalendarOpen(false);
                    }}
                  >
                    आज (Today)
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}

interface NepaliDateSearchProps {
  /** Callback with from/to AD ISO strings */
  onSearch: (fromDate: string, toDate: string) => void;
  className?: string;
  mode?: "AD" | "BS";
}

/** Search bar with AD/BS date range pickers */
export function NepaliDateSearch({ onSearch, className, mode = "BS" }: NepaliDateSearchProps) {
  const today = new Date().toISOString().split("T")[0];
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  return (
    <div className={cn("flex flex-col sm:flex-row items-end gap-2", className)}>
      {mode === "AD" ? (
        <>
          <div className="space-y-1">
            <Label className="text-xs">From (AD)</Label>
            <Input type="date" value={fromDate} max={today} onChange={(e) => setFromDate(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To (AD)</Label>
            <Input type="date" value={toDate} max={today} onChange={(e) => setToDate(e.target.value)} className="h-9 text-sm" />
          </div>
        </>
      ) : (
        <>
          <NepaliDateInput
            label="From (BS)"
            value={fromDate}
            onChange={setFromDate}
            showDual={false}
            hideModeLabel
          />
          <NepaliDateInput
            label="To (BS)"
            value={toDate}
            onChange={setToDate}
            showDual={false}
            hideModeLabel
          />
        </>
      )}
      <Button
        size="sm"
        className="h-9 px-4"
        onClick={() => onSearch(fromDate, toDate)}
      >
        Search
      </Button>
    </div>
  );
}
