'use client'

import { useState } from 'react'
import { apiFetch } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Database, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react'

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
  const isTableMissing =
    errorMsg.includes('does not exist') ||
    errorMsg.includes('not found') ||
    errorMsg.includes('relation') ||
    errorMsg.includes('table') ||
    errorMsg.includes('503')

  async function handleSetup() {
    setSettingUp(true)
    setSetupResult(null)
    try {
      const res = await apiFetch<{ message?: string; error?: string; hint?: string }>('/api/accounting/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.error) {
        setSetupResult(res.hint || res.error)
      } else {
        setSetupResult(res.message || 'Setup complete!')
        onRetry()
      }
    } catch (err) {
      setSetupResult(err instanceof Error ? err.message : 'Setup failed')
    } finally {
      setSettingUp(false)
    }
  }

  return (
    <Card className="p-6">
      <CardContent className="flex flex-col items-center justify-center text-center py-8 gap-4">
        <div className="flex size-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
          <AlertTriangle className="size-6 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-md">
            {isTableMissing
              ? 'Accounting tables may not be initialized in the database yet.'
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
