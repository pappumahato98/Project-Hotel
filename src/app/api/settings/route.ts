import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ─── Default Settings ───────────────────────────────────────────
const DEFAULT_SETTINGS: Record<string, unknown> = {
  // Tax & Fees
  taxRate: 13.0,
  serviceCharge: 10.0,
  tourismTax: 0,
  gstEnabled: false,

  // Booking Policies
  cancellationPolicy: 'moderate',
  cancellationHours: 24,
  noShowCharge: 100,
  depositRequired: false,
  depositPercent: 20,
  earlyCheckInCharge: 500,
  lateCheckoutCharge: 500,
  guaranteeRequired: true,

  // Payment Methods
  acceptCash: true,
  acceptCard: true,
  acceptBankTransfer: true,
  acceptDigitalWallet: true,
  acceptCheque: false,
  cardTypes: ['visa', 'mastercard'],

  // General / Business Hours / Property
  defaultCheckIn: '14:00',
  defaultCheckOut: '11:00',
  nightAuditTime: '23:00',
  hotelName: 'Meridian Hotel',
  hotelCode: 'MH',
  city: 'Kathmandu',
  country: 'Nepal',
  phone: '+977-1-4567890',
  email: 'info@meridianhotel.com',
  starRating: 5,
  address: 'Thamel, Kathmandu 44600',
  website: 'www.meridianhotel.com',

  // Room Defaults
  defaultMaxOccupancy: 2,
  defaultFloor: 1,
  autoAssignRoom: false,
  autoRoomStatusUpdate: true,
  minNightsDefault: 1,
  maxNightsDefault: 30,

  // Email & Communication
  smtpHost: 'smtp.meridianhotel.com',
  smtpPort: 587,
  smtpUser: 'noreply@meridianhotel.com',
  smtpEncryption: 'tls',
  emailFromName: 'Meridian Hotel',
  emailSignature: 'Best regards,\nMeridian Hotel Front Desk',
  sendBookingConfirmation: true,
  sendCheckoutReminder: true,
  sendPromoEmails: false,

  // Printing & Documents
  autoPrintReceipt: false,
  autoPrintFolio: false,
  printHeader: 'MERIDIAN HOTEL — Thamel, Kathmandu',
  printFooter: 'Thank you for staying with us!',
  showLogoOnPrint: true,
  invoiceFormat: 'detailed',
  receiptCopies: 1,

  // Integrations
  apiKey: 'mrk_api_xxxxxxxxxxxxxxxxxxxx',
  apiEnabled: false,
  channelSyncInterval: 15,
  webhooksEnabled: false,
  webhookUrl: '',
  posIntegration: false,
  crmIntegration: true,

  // Backup & Data
  autoBackup: true,
  autoBackupInterval: 'daily',
  lastBackupDate: new Date().toISOString(),
  dataRetentionDays: 365,
}

// ─── Category Mapping ───────────────────────────────────────────
const KEY_CATEGORY_MAP: Record<string, string> = {
  // Tax
  taxRate: 'tax',
  serviceCharge: 'tax',
  tourismTax: 'tax',
  gstEnabled: 'tax',

  // Policies
  cancellationPolicy: 'policies',
  cancellationHours: 'policies',
  noShowCharge: 'policies',
  depositRequired: 'policies',
  depositPercent: 'policies',
  earlyCheckInCharge: 'policies',
  lateCheckoutCharge: 'policies',
  guaranteeRequired: 'policies',

  // Payment
  acceptCash: 'payment',
  acceptCard: 'payment',
  acceptBankTransfer: 'payment',
  acceptDigitalWallet: 'payment',
  acceptCheque: 'payment',
  cardTypes: 'payment',

  // General (business hours + property details)
  defaultCheckIn: 'general',
  defaultCheckOut: 'general',
  nightAuditTime: 'general',
  hotelName: 'general',
  hotelCode: 'general',
  city: 'general',
  country: 'general',
  phone: 'general',
  email: 'general',
  starRating: 'general',
  address: 'general',
  website: 'general',

  // Room Defaults
  defaultMaxOccupancy: 'room_defaults',
  defaultFloor: 'room_defaults',
  autoAssignRoom: 'room_defaults',
  autoRoomStatusUpdate: 'room_defaults',
  minNightsDefault: 'room_defaults',
  maxNightsDefault: 'room_defaults',

  // Email
  smtpHost: 'email',
  smtpPort: 'email',
  smtpUser: 'email',
  smtpEncryption: 'email',
  emailFromName: 'email',
  emailSignature: 'email',
  sendBookingConfirmation: 'email',
  sendCheckoutReminder: 'email',
  sendPromoEmails: 'email',

  // Printing
  autoPrintReceipt: 'printing',
  autoPrintFolio: 'printing',
  printHeader: 'printing',
  printFooter: 'printing',
  showLogoOnPrint: 'printing',
  invoiceFormat: 'printing',
  receiptCopies: 'printing',

  // Integrations
  apiKey: 'integrations',
  apiEnabled: 'integrations',
  channelSyncInterval: 'integrations',
  webhooksEnabled: 'integrations',
  webhookUrl: 'integrations',
  posIntegration: 'integrations',
  crmIntegration: 'integrations',

  // Backup
  autoBackup: 'backup',
  autoBackupInterval: 'backup',
  lastBackupDate: 'backup',
  dataRetentionDays: 'backup',
}

// ─── Type Detection ─────────────────────────────────────────────
function detectType(value: unknown): string {
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  if (Array.isArray(value)) return 'json'
  return 'string'
}

// ─── Value Serialization ──────────────────────────────────────────
function serializeValue(value: unknown): string {
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return JSON.stringify(value)
  return String(value)
}

// ─── Value Parsing ──────────────────────────────────────────────
function parseValue(raw: string, type: string): unknown {
  switch (type) {
    case 'number':
      return parseFloat(raw)
    case 'boolean':
      return raw === 'true'
    case 'json':
      try {
        return JSON.parse(raw)
      } catch {
        return raw
      }
    default:
      return raw
  }
}

// ─── Seed Default Settings ──────────────────────────────────────
async function seedDefaults() {
  const existing = await db.systemSetting.findMany({ select: { key: true } })
  const existingKeys = new Set(existing.map(s => s.key))

  const data = Object.entries(DEFAULT_SETTINGS)
    .filter(([key]) => !existingKeys.has(key))
    .map(([key, value]) => ({
      category: KEY_CATEGORY_MAP[key] || 'general',
      key,
      value: serializeValue(value),
      type: detectType(value),
    }))

  if (data.length > 0) {
    await db.systemSetting.createMany({ data })
  }
}

// ─── GET: Fetch all settings as flat key → parsed value ────────
export async function GET() {
  try {
    const count = await db.systemSetting.count()

    if (count === 0) {
      await seedDefaults()
    }

    const settings = await db.systemSetting.findMany()

    const result: Record<string, unknown> = {}
    for (const s of settings) {
      result[s.key] = parseValue(s.value, s.type)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

// ─── PUT: Upsert settings and return full settings object ───────
export async function PUT(request: Request) {
  try {
    const body: Record<string, unknown> = await request.json()

    const entries = Object.entries(body)

    for (const [key, value] of entries) {
      const type = detectType(value)
      const serialized = serializeValue(value)
      const category = KEY_CATEGORY_MAP[key] || 'general'

      await db.systemSetting.upsert({
        where: { key },
        update: {
          value: serialized,
          type,
          updatedAt: new Date(),
        },
        create: {
          category,
          key,
          value: serialized,
          type,
          description: undefined,
        },
      })
    }

    // Return full settings after update
    const settings = await db.systemSetting.findMany()

    const result: Record<string, unknown> = {}
    for (const s of settings) {
      result[s.key] = parseValue(s.value, s.type)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Settings PUT error:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
