import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST() {
  try {
    await db.systemSetting.deleteMany({})
    // The GET endpoint will auto-seed defaults on next call
    return NextResponse.json({ success: true, message: 'All settings reset to defaults' })
  } catch (error) {
    console.error('Settings reset error:', error)
    return NextResponse.json({ error: 'Failed to reset settings' }, { status: 500 })
  }
}
