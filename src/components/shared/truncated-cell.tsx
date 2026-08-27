import { cn } from '@/lib/utils'

/**
 * TruncatedCell — Table cell wrapper that truncates long text with ellipsis.
 *
 * **States:** default only.
 * **Accessibility:** Full text in title attribute for screen readers / tooltips.
 * **Responsive:** max-width adapts via size prop.
 * **Edge Cases:** Null/ renders empty; maxLength truncates with "…"
 *
 * @example
 * <TruncatedCell text={guestName} maxWidth="sm" />
 * <TruncatedCell text={longDescription} maxWidth="lg" maxLength={100} />
 */
export function TruncatedCell({
 text,
 maxWidth = 'md',
 maxLength,
 className,
}: {
 text: string | null | undefined
 maxWidth?: 'sm'| 'md'| 'lg'| 'xl'| '2xl'| 'full'
 maxLength?: number
 className?: string
}) {
 if (text == null) return <span className={cn('text-muted-foreground', className)}>—</span>

 const displayText = maxLength && text.length > maxLength
 ? text.slice(0, maxLength) + '…'
 : text

 const widthClass: Record<string, string> = {
 sm: 'truncate-cell-sm',
 md: 'truncate-cell',
 lg: 'truncate-cell-lg',
 xl: 'truncate-cell-xl',
 '2xl': 'max-w-2xl truncate-cell',
 full: 'max-w-full truncate-cell',
 }

 return (
 <span
 title={text}
 className={cn(widthClass[maxWidth] || 'truncate-cell', 'block', className)}
 >
 {displayText}
 </span>
 )
}