import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/security/auth-helpers'
import { fetchKpis, fetchAlerts, fetchActivity } from './_data'

/**
 * Orchestrator — backward-compatible /api/dashboard endpoint.
 *
 * Calls the three data-fetching functions directly (no HTTP hops).
 * Each function uses getOrSet() with a 5-min TTL, so within a single
 * function invocation only uncached keys hit the database.
 *
 * Individual sub-endpoints (/kpis, /alerts, /activity) call the same
 * cached functions, so there's zero duplication.
 */

export const maxDuration = 60

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  try {
    // All three run in parallel, each independently cached (5-min TTL).
    // First request: ~4-6s total DB time (Mumbai). Cached requests: < 5ms.
    const [kpisData, alertsData, activityData] = await Promise.allSettled([
      fetchKpis(),
      fetchAlerts(),
      fetchActivity(),
    ])

    const errors: string[] = []
    const kpis = kpisData.status === 'fulfilled' ? kpisData.value : null
    const alerts = alertsData.status === 'fulfilled' ? alertsData.value : null
    const activity = activityData.status === 'fulfilled' ? activityData.value : null

    if (!kpis) errors.push('kpis')
    if (!alerts) errors.push('alerts')
    if (!activity) errors.push('activity')

    // If ALL failed, return 500
    if (errors.length === 3) {
      const reasons = [
        kpisData.status === 'rejected' ? String(kpisData.reason) : 'unknown',
        alertsData.status === 'rejected' ? String(alertsData.reason) : 'unknown',
        activityData.status === 'rejected' ? String(activityData.reason) : 'unknown',
      ]
      console.error('[dashboard/orchestrator] All sub-endpoints failed:', reasons)
      return NextResponse.json(
        { error: 'All dashboard sub-endpoints failed', details: reasons },
        { status: 500 },
      )
    }

    // Partial failure — return what we have + flag missing sections
    if (errors.length > 0) {
      console.warn(`[dashboard/orchestrator] Partial failure — missing: ${errors.join(', ')}`)
    }

    // Merge into the original response shape for backward compatibility
    const response: Record<string, unknown> = {}
    if (kpis) {
      response.kpis = kpis.kpis
      response.roomStatusBreakdown = kpis.roomStatusBreakdown
      response.revenueChart = kpis.revenueChart
    }
    if (alerts) {
      response.alerts = alerts.alerts
    }
    if (activity) {
      response.recentActivity = activity.recentActivity
    }
    if (errors.length > 0) {
      response._partial = true
      response._missing = errors
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[dashboard/orchestrator] error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data', detail: msg.substring(0, 500) },
      { status: 500 },
    )
  }
}
