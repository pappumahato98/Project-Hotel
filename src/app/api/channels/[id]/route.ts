import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { afterMutation } from '@/lib/cache'
import { broadcastEvent } from '@/lib/broadcast'
import { requireAuth } from '@/lib/security/auth-helpers'
import { cachedError, clearCacheHeaders } from '@/lib/api-response'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const { id } = await params

    const channel = await db.channel.delete({
      where: { id },
    })

    broadcastEvent('channel:deleted', channel)
    return NextResponse.json(channel, { headers: clearCacheHeaders() })
  } catch (error) {
    console.error('Channel DELETE error:', error)
    return cachedError('Failed to delete channel', 500)
  }
}
