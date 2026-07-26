'use client'

import { getBedTypeName, getTypeShortcut } from '@/lib/format'
import { cn } from '@/lib/utils'

interface RoomTypeBedBadgeProps {
  typeName: string | null | undefined
  bedConfig: string | null | undefined
  typeCode?: string | null
  pax?: number
  className?: string
  inline?: boolean
}

/**
 * Renders room type & bed info with optional pax count in red.
 * Format: "DLX #Twin +2" where "#Twin" shows bed type and "+2" is red.
 */
export function RoomTypeBedBadge({ typeName, bedConfig, typeCode, pax, className, inline }: RoomTypeBedBadgeProps) {
  const typeShortcut = getTypeShortcut(typeName, typeCode)
  const bedName = getBedTypeName(bedConfig)
  const hasContent = typeShortcut || bedName
  if (!hasContent && pax === undefined) return null

  if (inline) {
    return (
      <span className={cn('text-[10px] font-mono font-medium tracking-wide', className)}>
        {typeShortcut && <span className="text-muted-foreground">{typeShortcut}</span>}
        {typeShortcut && bedName && <span className="text-muted-foreground/60"> #</span>}
        {bedName && <span className="text-muted-foreground">{bedName}</span>}
        {(typeShortcut || bedName) && pax !== undefined && pax > 0 && (
          <span className="text-red-500 dark:text-red-400 font-semibold ml-0.5"> +{pax}</span>
        )}
      </span>
    )
  }

  return (
    <span className={cn(
      'inline-flex items-center gap-0 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide bg-muted/70 text-muted-foreground',
      className,
    )}>
      {typeShortcut}
      {typeShortcut && bedName && <span className="text-muted-foreground/60"> #</span>}
      {bedName}
      {pax !== undefined && pax > 0 && (
        <span className="text-red-500 dark:text-red-400 font-semibold ml-0.5"> +{pax}</span>
      )}
    </span>
  )
}