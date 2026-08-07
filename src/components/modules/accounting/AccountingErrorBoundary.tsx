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

  // Detect Prisma/Postgres schema errors — table missing, column missing, or 503
  const isSchemaError =
    (errorMsg.includes('does not exist') && (
      errorMsg.includes('relation') ||
      errorMsg.includes('column') ||
      errorMsg.includes('table')
    )) ||
    errorMsg.includes('relation "') ||
    errorMsg.includes('column `') ||
    errorMsg.includes('table "') ||
    errorMsg.includes('503')

  // Check if the original API error was a permissions issue (not a schema issue)
  const isPermissionError =
    errorMsg.includes('Insufficient permissions') ||
    errorMsg.includes('403')

  async function handleSetup() {
    setSettingUp(true)
    setSetupResult(null)
    try {
      if (isSchemaError) {
        // Schema issue — call /api/db-setup to run prisma db push
        const res = await apiFetch<{ success?: boolean; message?: string; error?: string; logs?: string[] }>('/api/db-setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: '' }), // token empty — allowed when no users or schema is broken
        })
        if (res.error) {
          setSetupResult(`Schema sync failed: ${res.error}`)
        } else if (res.success) {
          setSetupResult('Schema synced! Retrying...')
          onRetry()
        } else {
          setSetupResult(res.message || 'Schema sync completed.')
          onRetry()
        }
      } else {
        // Data issue — call /api/accounting/setup to seed chart of accounts
        const res = await apiFetch<{ message?: string; error?: string; hint?: string }>('/api/accounting/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
        if (res.error) {
          if (res.error === 'Insufficient permissions' || res.error === 'Authentication required') {
            setSetupResult('Permission denied — ask an Admin or GM to initialize accounting.')
          } else {
            setSetupResult(res.hint || res.error)
          }
        } else {
          setSetupResult(res.message || 'Setup complete!')
          onRetry()
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Setup failed'
      setSetupResult(msg)
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
            {isSchemaError
              ? 'Database schema is out of date. A column or table is missing.'
              : isPermissionError
                ? 'You do not have permission to view this data. Contact an administrator.'
                : errorMsg}
          </p>
        </div>

        {setupResult ? (
          <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-md ${setupResult.includes('complete') || setupResult.includes('initialized') || setupResult.includes('synced')
              ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
              : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
            }`}>
            {(setupResult.includes('complete') || setupResult.includes('initialized') || setupResult.includes('synced'))
              ? <CheckCircle2 className="size-3.5" />
              : <AlertTriangle className="size-3.5" />}
            {setupResult}
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          {(isSchemaError || isPermissionError) && (
            <Button size="sm" onClick={handleSetup} disabled={settingUp}>
              <Database className="size-3.5 mr-1.5" />
              {settingUp ? 'Syncing...' : isSchemaError ? 'Sync Database Schema' : 'Initialize Accounting'}
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
