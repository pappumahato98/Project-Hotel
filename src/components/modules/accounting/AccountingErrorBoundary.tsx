'use client'

import { useState } from 'react'
import { apiFetch } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Database, RefreshCw, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react'

interface Props {
  error: Error | null
  onRetry: () => void
  title?: string
}

/**
 * Shared error display for accounting views.
 * Detects table-not-found errors and offers one-click setup.
 * Otherwise shows a generic retry prompt.
 */
export function AccountingError({ error, onRetry, title = 'Failed to load data' }: Props) {
  const [settingUp, setSettingUp] = useState(false)
  const [setupResult, setSetupResult] = useState<string | null>(null)

  const errorMsg = error?.message || 'Unknown error'

  // Precise detection: only match Prisma/Postgres relation-not-found errors,
  // not generic messages like "Insufficient permissions" or "not found" in unrelated contexts.
  const isTableMissing =
    (errorMsg.includes('does not exist') && errorMsg.includes('relation')) ||
    errorMsg.includes('relation "') ||
    errorMsg.includes('table "') ||
    errorMsg.includes('503')

  // Check if the original API error was a permissions issue (not a table issue)
  const isPermissionError =
    errorMsg.includes('Insufficient permissions') ||
    errorMsg.includes('403')

  async function handleSetup() {
    setSettingUp(true)
    setSetupResult(null)
    try {
      const res = await apiFetch<{ message?: string; error?: string; hint?: string }>('/api/accounting/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.error) {
        // Provide a user-friendly message for common errors
        if (res.error === 'Insufficient permissions' || res.error === 'Authentication required') {
          setSetupResult('Permission denied — ask an Admin or GM to initialize accounting.')
        } else {
          setSetupResult(res.hint || res.error)
        }
      } else {
        setSetupResult(res.message || 'Setup complete!')
        onRetry()
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Setup failed'
      if (msg.includes('Insufficient permissions') || msg.includes('403')) {
        setSetupResult('Permission denied — ask an Admin or GM to initialize accounting.')
      } else {
        setSetupResult(msg)
      }
    } finally {
      setSettingUp(false)
    }
  }

  return (
    <Card className="p-6">
      <CardContent className="flex flex-col items-center justify-center text-center py-8 gap-4">
        <div className="flex size-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
          {isPermissionError
            ? <ShieldAlert className="size-6 text-amber-600 dark:text-amber-400" />
            : <AlertTriangle className="size-6 text-red-600 dark:text-red-400" />}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-md">
            {isTableMissing
              ? 'Accounting tables may not be initialized in the database yet.'
              : isPermissionError
                ? 'You do not have permission to view this data. Contact an administrator.'
                : errorMsg}
          </p>
        </div>

        {setupResult ? (
          <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-md ${setupResult.includes('complete') || setupResult.includes('initialized')
              ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
              : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
            }`}>
            {(setupResult.includes('complete') || setupResult.includes('initialized'))
              ? <CheckCircle2 className="size-3.5" />
              : <AlertTriangle className="size-3.5" />}
            {setupResult}
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          {isTableMissing && (
            <Button size="sm" onClick={handleSetup} disabled={settingUp}>
              <Database className="size-3.5 mr-1.5" />
              {settingUp ? 'Initializing...' : 'Initialize Accounting'}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RefreshCw className="size-3.5 mr-1.5" />
            Retry
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
