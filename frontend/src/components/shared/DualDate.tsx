import { adToBS, formatBSDate, isoToBS } from "@/lib/nepaliDate";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, formatAD } from "@/lib/utils";
import { useLocalizationSettings } from "@/hooks/useSettings";

interface DualDateProps {
  /** ISO string (YYYY-MM-DD) or Date object */
  date: string | Date;
  /** Show format for AD date */
  adFormat?: string;
  /** Show format for BS date */
  bsFormat?: "short" | "long" | "nepali";
  /** Show only BS date */
  bsOnly?: boolean;
  /** Additional class */
  className?: string;
  /** Compact mode - show BS in tooltip only */
  compact?: boolean;
}

export function DualDate({
  date,
  adFormat = "dd/MM/yyyy",
  bsFormat = "short",
  bsOnly = false,
  className,
  compact = false,
}: DualDateProps) {
  const { data: locSettings } = useLocalizationSettings();
  const calendarMode = locSettings?.calendar_mode || "AD";

  const adDate = typeof date === "string" ? new Date(date) : date;
  const bsDate = adToBS(adDate);
  const adFormatted = formatAD(adDate);
  const bsFormatted = formatBSDate(bsDate, bsFormat);

  const displayPrimary = calendarMode === "BS" ? bsFormatted : adFormatted;
  const displaySecondary = calendarMode === "BS" ? adFormatted : bsFormatted;
  const secondaryLabel = calendarMode === "BS" ? "AD" : "BS";

  if (bsOnly) {
    return <span className={cn("text-foreground", className)}>{bsFormatted}</span>;
  }

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("text-foreground cursor-help border-b border-dotted border-muted-foreground/30", className)}>
            {displayPrimary}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <span className="text-muted-foreground">{secondaryLabel}:</span>{" "}
          <span className="font-medium">{displaySecondary}</span>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <span className={cn("inline-flex flex-col leading-tight", className)}>
      <span className="text-foreground">{displayPrimary}</span>
      <span className="text-[10px] text-muted-foreground">{displaySecondary} {secondaryLabel}</span>
    </span>
  );
}

interface DualDateBadgeProps {
  date: string | Date;
  className?: string;
}

/** Small inline badge showing both dates */
export function DualDateBadge({ date, className }: DualDateBadgeProps) {
  const { data: locSettings } = useLocalizationSettings();
  const calendarMode = locSettings?.calendar_mode || "AD";

  const adDate = typeof date === "string" ? new Date(date) : date;
  const bsDate = adToBS(adDate);
  const bsFormatted = formatBSDate(bsDate, "short");
  const adFormatted = formatAD(adDate);

  const primary = calendarMode === "BS" ? bsFormatted : adFormatted;
  const secondary = calendarMode === "BS" ? adFormatted : bsFormatted;

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", className)}>
      <span className="text-foreground">{primary}</span>
      <span className="text-muted-foreground">|</span>
      <span className="text-primary font-medium">{secondary}</span>
    </span>
  );
}
