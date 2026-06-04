import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { broadcastEvent } from '@/lib/broadcast'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const channel = await db.channel.delete({
      where: { id },
    })

    broadcastEvent('channel:deleted', channel)
    return NextResponse.json(channel)
  } catch (error) {
    console.error('Channel DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete channel' }, { status: 500 })
  }
}
