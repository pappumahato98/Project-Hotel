'use client'

import { useEffect, useRef, useCallback } from 'react'

interface UseEnterSubmitOptions {
  /** Callback when Enter is pressed */
  onSubmit: () => void
  /** Whether the submit is currently disabled */
  disabled?: boolean
  /** Whether to also submit on Ctrl+Enter / Cmd+Enter in textareas */
  submitOnCtrlEnter?: boolean
}

/**
 * Hook to add Enter-to-submit behavior to a dialog or form container.
 * - Enter on <Input> → triggers submit
 * - Enter on <Textarea> → inserts newline (unless submitOnCtrlEnter + Ctrl/Cmd is held)
 * - Ctrl/Cmd+Enter on <Textarea> → triggers submit (when submitOnCtrlEnter=true)
 * - Escape → does nothing (handled by Radix Dialog natively)
 *
 * @example
 * const submitRef = useEnterSubmit({ onSubmit: handleSubmit, disabled: isPending })
 * return <div ref={submitRef}>...</div>
 */
export function useEnterSubmit({ onSubmit, disabled = false, submitOnCtrlEnter = true }: UseEnterSubmitOptions) {
  const handlerRef = useRef(onSubmit)
  const disabledRef = useRef(disabled)

  const ref = useRef<HTMLDivElement>(null)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabledRef.current) return

      const target = e.target as HTMLElement

      // Only handle Enter key
      if (e.key !== 'Enter') return

      // Skip if user is holding Shift (for textarea newline)
      if (e.shiftKey) return

      // For textareas: Enter = newline, Ctrl/Cmd+Enter = submit
      if (target.tagName === 'TEXTAREA') {
        if (submitOnCtrlEnter && (e.metaKey || e.ctrlKey)) {
          e.preventDefault()
          handlerRef.current()
        }
        return
      }

      // For inputs and other focusable elements: Enter = submit
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        e.preventDefault()
        handlerRef.current()
      }
    },
    [submitOnCtrlEnter]
  )

  useEffect(() => {
    handlerRef.current = onSubmit
    disabledRef.current = disabled
  }, [onSubmit, disabled])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.addEventListener('keydown', handleKeyDown)
    return () => el.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return ref
}
