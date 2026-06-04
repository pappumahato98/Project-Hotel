'use client'

import { useEffect, useCallback, useRef } from 'react'

export interface KeyboardShortcut {
  /** Unique identifier for the shortcut */
  id: string
  /** Key combination description for display (e.g., "⌘K", "Ctrl+1") */
  label: string
  /** Description of what the shortcut does */
  description: string
  /** The keyboard key (e.g., 'k', '1', 'Escape') */
  key: string
  /** Whether Ctrl/Cmd is required */
  meta?: boolean
  /** Whether Shift is required */
  shift?: boolean
  /** Whether Alt/Option is required */
  alt?: boolean
  /** Callback when shortcut is triggered */
  handler: () => void
  /** Category for grouping in help overlay */
  category?: 'navigation' | 'action' | 'global'
  /** Whether this shortcut is currently active (conditionally disable) */
  enabled?: boolean
}

// ─── Global Registry ───────────────────────────────────────────────
const shortcutRegistry = new Map<string, KeyboardShortcut>()

/** Register a global keyboard shortcut, returns cleanup fn */
export function registerShortcut(shortcut: KeyboardShortcut): () => void {
  shortcutRegistry.set(shortcut.id, shortcut)
  return () => shortcutRegistry.delete(shortcut.id)
}

/** Get all registered shortcuts (for the help dialog) */
export function getRegisteredShortcuts(): KeyboardShortcut[] {
  return Array.from(shortcutRegistry.values()).filter((s) => s.enabled !== false)
}

// ─── Match Logic ───────────────────────────────────────────────────
function matchesShortcut(e: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
  const target = e.target as HTMLElement
  const isInput =
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable

  // Don't trigger non-meta shortcuts when typing in inputs
  if (isInput && !shortcut.meta && !shortcut.alt) return false

  const metaMatch = shortcut.meta
    ? e.metaKey || e.ctrlKey
    : !(e.metaKey || e.ctrlKey)

  const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey
  const altMatch = shortcut.alt ? e.altKey : !e.altKey
  const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase()

  return metaMatch && shiftMatch && altMatch && keyMatch
}

// ─── Single Shortcut Hook ──────────────────────────────────────────
/**
 * Hook to register a single global keyboard shortcut.
 * Automatically cleans up on unmount.
 */
export function useKeyboardShortcut(shortcut: KeyboardShortcut) {
  const handlerRef = useRef(shortcut.handler)
  const enabledRef = useRef(shortcut.enabled !== false)

  // Sync refs via effect (avoiding render-time ref mutation)
  useEffect(() => {
    handlerRef.current = shortcut.handler
    enabledRef.current = shortcut.enabled !== false
  })

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabledRef.current) return
      if (matchesShortcut(e, shortcut)) {
        e.preventDefault()
        e.stopPropagation()
        handlerRef.current()
      }
    },
    [shortcut]
  )

  useEffect(() => {
    const cleanup = registerShortcut(shortcut)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      cleanup()
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [shortcut.id, handleKeyDown])
}

// ─── Multiple Shortcuts Hook ────────────────────────────────────────
/**
 * Hook to register multiple global keyboard shortcuts at once.
 * Uses refs to avoid re-attaching listeners on every render.
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  // Use refs to store the latest shortcuts by ID
  const shortcutsRef = useRef<KeyboardShortcut[]>(shortcuts)

  // Sync ref via effect (avoiding render-time ref mutation)
  useEffect(() => {
    shortcutsRef.current = shortcuts
  })

  // Stable ID string to detect when shortcuts list changes
  const currentIds = shortcuts.map((s) => s.id).join(',')

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      for (const shortcut of shortcutsRef.current) {
        if (!shortcut.enabled && shortcut.enabled !== undefined) continue
        if (matchesShortcut(e, shortcut)) {
          e.preventDefault()
          e.stopPropagation()
          shortcut.handler()
          return // Only fire the first match
        }
      }
    },
    [] // Stable — reads from shortcutsRef
  )

  useEffect(() => {
    // Register all shortcuts in the registry
    const cleanups = shortcuts.map((s) => registerShortcut(s))

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      cleanups.forEach((c) => c())
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [currentIds, handleKeyDown])
}
