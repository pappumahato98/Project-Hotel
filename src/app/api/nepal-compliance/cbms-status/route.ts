import { NextRequest, NextResponse } from 'next/server'
import { validateCBMSSettings, syncFailedInvoices } from '@/lib/nepal-compliance/cbms'
import { requireAuth } from '@/lib/security/auth-helpers'
import { cachedJson, cachedError, clearCacheHeaders } from '@/lib/api-response'

// ─── GET: CBMS configuration status and recent sync results ──────────

export async function GET(request: NextRequest) {
  try {
    const validation = await validateCBMSSettings()

    return cachedJson({
      configured: validation.configured,
      missingFields: validation.missingFields,
      enabled: validation.configured,
      lastSyncAt: null,
      status: validation.configured ? 'ready' : 'not_configured',
    }, request, { tier: 'long' })
  } catch (error) {
    console.error('[cbms-status] GET error:', error)
    return cachedError('Failed to retrieve CBMS status.', 500)
  }
}

// ─── POST: Manually trigger CBMS sync for failed invoices ───────────

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ['admin', 'manager', 'gm'])
    if (auth instanceof NextResponse) return auth

    const result = await syncFailedInvoices()

    return NextResponse.json({
      success: result.queued,
      message: result.queued
        ? `Queued ${result.count} invoices for CBMS sync.`
        : 'No pending invoices found for sync.',
      queuedCount: result.count,
    }, { headers: clearCacheHeaders() })
  } catch (error) {
    console.error('[cbms-status] POST error:', error)
    return cachedError('Failed to trigger CBMS sync.', 500)
  }
}
