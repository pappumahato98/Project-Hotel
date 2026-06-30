'use client'

import { getRoomTypeBedShort } from '@/lib/format'
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
 * Renders room type & bed shortcuts with optional pax count in red.
 * Example output: [DLX Kng +2] where "+2" is red.
 */
export function RoomTypeBedBadge({ typeName, bedConfig, typeCode, pax, className, inline }: RoomTypeBedBadgeProps) {
  const shortcut = getRoomTypeBedShort(typeName, bedConfig, typeCode)
  if (!shortcut && pax === undefined) return null

  if (inline) {
    return (
      <span className={cn('text-[10px] font-mono font-medium tracking-wide', className)}>
        {shortcut && <span className="text-muted-foreground">{shortcut}</span>}
        {shortcut && pax !== undefined && <span className="mx-0.5 text-muted-foreground/40">·</span>}
        {pax !== undefined && pax > 0 && (
          <span className="text-red-500 dark:text-red-400 font-semibold">+{pax}</span>
        )}
      </span>
    )
  }

  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide bg-muted/70 text-muted-foreground',
      className,
    )}>
      {shortcut}
      {pax !== undefined && pax > 0 && (
        <span className="text-red-500 dark:text-red-400 font-semibold ml-0.5">+{pax}</span>
      )}
    </span>
  )
}