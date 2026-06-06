import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Auth State ────────────────────────────────────────────────
interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  department: string
  position: string
  avatarUrl: string | null
}

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  token: string | null
  login: (user: AuthUser, token: string) => void
  logout: () => void
  updateUser: (updates: Partial<AuthUser>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      token: null,
      login: (user, token) => set({ user, isAuthenticated: true, token }),
      logout: () => set({ user: null, isAuthenticated: false, token: null }),
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
    }),
    {
      name: 'meridian-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        token: state.token,
      }),
    }
  )
)

// ─── Property State ──────────────────────────────────────────────
export interface Property {
  id: string
  name: string
  code: string
  city: string
}

interface PropertyState {
  activeProperty: Property
  properties: Property[]
  setActiveProperty: (property: Property) => void
}

export const usePropertyStore = create<PropertyState>()(
  persist(
    (set) => ({
      activeProperty: {
        id: 'prop-1',
        name: 'Meridian Hotel',
        code: 'MH',
        city: 'Kathmandu',
      },
      properties: [
        { id: 'prop-1', name: 'Meridian Hotel', code: 'MH', city: 'Kathmandu' },
        { id: 'prop-2', name: 'Lakeside Resort Pokhara', code: 'LRP', city: 'Pokhara' },
        { id: 'prop-3', name: 'Himalayan View Hotel', code: 'HVH', city: 'Nagarkot' },
      ],
      setActiveProperty: (property) => set({ activeProperty: property }),
    }),
    {
      name: 'meridian-property',
      partialize: (state) => ({
        activeProperty: state.activeProperty,
      }),
    }
  )
)

// ─── User Preferences State ────────────────────────────────────
interface UserPreferences {
  language: string
  currency: string
  timezone: string
  dateFormat: string
  notifications: boolean
  compactMode: boolean
}

interface PreferencesState {
  preferences: UserPreferences
  updatePreferences: (updates: Partial<UserPreferences>) => void
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      preferences: {
        language: 'en',
        currency: 'NPR',
        timezone: 'Asia/Katmandu',
        dateFormat: 'MM/DD/YYYY',
        notifications: true,
        compactMode: false,
      },
      updatePreferences: (updates) =>
        set((state) => ({
          preferences: { ...state.preferences, ...updates },
        })),
    }),
    {
      name: 'meridian-preferences',
    }
  )
)

// ─── System Settings State ──────────────────────────────────
export interface SystemSettings {
  // Tax & Fees
  taxRate: number
  serviceCharge: number
  tourismTax: number
  gstEnabled: boolean

  // Booking Policies
  cancellationPolicy: string // flexible, moderate, strict
  cancellationHours: number
  noShowCharge: number
  depositRequired: boolean
  depositPercent: number
  earlyCheckInCharge: number
  lateCheckoutCharge: number
  guaranteeRequired: boolean

  // Payment Methods
  acceptCash: boolean
  acceptCard: boolean
  acceptBankTransfer: boolean
  acceptDigitalWallet: boolean
  acceptCheque: boolean
  cardTypes: string[] // visa, mastercard, amex

  // Business Hours
  defaultCheckIn: string
  defaultCheckOut: string
  nightAuditTime: string

  // Property Details
  hotelName: string
  hotelCode: string
  city: string
  country: string
  phone: string
  email: string
  starRating: number
  address: string
  website: string

  // Room Defaults
  defaultMaxOccupancy: number
  defaultFloor: number
  autoAssignRoom: boolean
  autoRoomStatusUpdate: boolean
  minNightsDefault: number
  maxNightsDefault: number

  // Email & Communication
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpEncryption: string
  emailFromName: string
  emailSignature: string
  sendBookingConfirmation: boolean
  sendCheckoutReminder: boolean
  sendPromoEmails: boolean

  // Printing & Documents
  autoPrintReceipt: boolean
  autoPrintFolio: boolean
  printHeader: string
  printFooter: string
  showLogoOnPrint: boolean
  invoiceFormat: string
  receiptCopies: number

  // Integrations
  apiKey: string
  apiEnabled: boolean
  channelSyncInterval: number
  webhooksEnabled: boolean
  webhookUrl: string
  posIntegration: boolean
  crmIntegration: boolean

  // Security
  autoLogout: string // 15min, 30min, 1hr, 2hr, never

  // Backup & Data
  autoBackup: boolean
  autoBackupInterval: string
  lastBackupDate: string
  dataRetentionDays: number

  // Notifications
  notifCheckInReminders: boolean
  notifCheckOutReminders: boolean
  notifOverbookingAlerts: boolean
  notifLowStockAlerts: boolean
  notifPaymentReceived: boolean
  notifNightAuditAlert: boolean
  notifNewReservations: boolean
  notifMaintenanceAlerts: boolean
  notifShiftHandover: boolean
  notifHkTaskCompleted: boolean
}

interface SettingsState {
  settings: SystemSettings
  _loaded: boolean
  _loading: boolean
  updateSettings: (updates: Partial<SystemSettings>) => void
  resetSettings: () => Promise<void>
  syncFromBackend: (force?: boolean) => Promise<SystemSettings>
  saveToBackend: (updates: Partial<SystemSettings>) => Promise<SystemSettings>
}

const DEFAULT_SETTINGS: SystemSettings = {
  taxRate: 13.0,
  serviceCharge: 10.0,
  tourismTax: 0,
  gstEnabled: false,
  cancellationPolicy: 'moderate',
  cancellationHours: 24,
  noShowCharge: 100,
  depositRequired: false,
  depositPercent: 20,
  earlyCheckInCharge: 500,
  lateCheckoutCharge: 500,
  guaranteeRequired: true,
  acceptCash: true,
  acceptCard: true,
  acceptBankTransfer: true,
  acceptDigitalWallet: true,
  acceptCheque: false,
  cardTypes: ['visa', 'mastercard'],
  defaultCheckIn: '14:00',
  defaultCheckOut: '11:00',
  nightAuditTime: '23:00',
  hotelName: 'Meridian Hotel',
  hotelCode: 'MH',
  city: 'Kathmandu',
  country: 'Nepal',
  phone: '+977-1-4567890',
  email: 'info@meridian.com',
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
  // Security
  autoLogout: '30min',
  // Backup & Data
  autoBackup: true,
  autoBackupInterval: 'daily',
  lastBackupDate: new Date().toISOString(),
  dataRetentionDays: 365,
  // Notifications
  notifCheckInReminders: true,
  notifCheckOutReminders: true,
  notifOverbookingAlerts: true,
  notifLowStockAlerts: true,
  notifPaymentReceived: true,
  notifNightAuditAlert: false,
  notifNewReservations: true,
  notifMaintenanceAlerts: true,
  notifShiftHandover: true,
  notifHkTaskCompleted: false,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      _loaded: false,
      _loading: false,
      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),
      resetSettings: async () => {
        try {
          await fetch('/api/settings/reset', { method: 'POST' })
        } catch (err) {
          console.error('Failed to reset settings on backend:', err)
        }
        set({ settings: DEFAULT_SETTINGS, _loaded: false })
      },
      // Sync from backend API — fetches all settings and updates store
      syncFromBackend: async (force = false) => {
        const { _loaded } = get()
        if (_loaded && !force) return get().settings
        set({ _loading: true })
        try {
          const res = await fetch('/api/settings')
          if (res.ok) {
            const data = await res.json()
            set({ settings: { ...DEFAULT_SETTINGS, ...data }, _loaded: true, _loading: false })
            return data
          }
        } catch (err) {
          console.error('Failed to sync settings from backend:', err)
        }
        set({ _loading: false })
        return get().settings
      },
      // Push updates to backend — calls PUT and syncs store
      saveToBackend: async (updates) => {
        set((state) => ({
          settings: { ...state.settings, ...updates },
        }))
        try {
          const res = await fetch('/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          })
          if (res.ok) {
            const data = await res.json()
            set({ settings: { ...DEFAULT_SETTINGS, ...data }, _loaded: true })
            return data
          }
        } catch (err) {
          console.error('Failed to save settings to backend:', err)
        }
        return get().settings
      },
    }),
    {
      name: 'meridian-settings',
    }
  )
)

// ─── Navigation State ────────────────────────────────────────
interface NavigationState {
  activeModule: string
  activeSubModule: string | null
  expandedItems: string[]
  searchOpen: boolean

  setActiveModule: (module: string) => void
  setActiveSubModule: (subModule: string | null) => void
  toggleExpanded: (itemId: string) => void
  setSearchOpen: (open: boolean) => void
  navigateTo: (module: string, subModule?: string | null) => void
}

export const useNavigationStore = create<NavigationState>((set) => ({
  activeModule: 'dashboard',
  activeSubModule: null,
  expandedItems: [],
  searchOpen: false,

  setActiveModule: (module) =>
    set((state) => ({
      activeModule: module,
      activeSubModule: null,
    })),

  setActiveSubModule: (subModule) =>
    set({ activeSubModule: subModule }),

  toggleExpanded: (itemId) =>
    set((state) => ({
      expandedItems: state.expandedItems.includes(itemId)
        ? state.expandedItems.filter((id) => id !== itemId)
        : [...state.expandedItems, itemId],
    })),

  setSearchOpen: (open) => set({ searchOpen: open }),

  navigateTo: (module, subModule = null) =>
    set((state) => ({
      activeModule: module,
      activeSubModule: subModule,
      expandedItems: subModule && !state.expandedItems.includes(module)
        ? [...state.expandedItems, module]
        : state.expandedItems,
    })),
}))

// ─── Folio Context State ──────────────────────────────
// Used to pass reservation/folio context from InHouse → Folio view
export interface FolioContext {
  reservationId: string
  guestId: string
  guestName: string
  roomNumber: string
  confirmationNo: string
  folioId?: string
}

interface FolioContextState {
  folioContext: FolioContext | null
  setFolioContext: (ctx: FolioContext | null) => void
  clearFolioContext: () => void
}

export const useFolioContextStore = create<FolioContextState>((set) => ({
  folioContext: null,
  setFolioContext: (ctx) => set({ folioContext: ctx }),
  clearFolioContext: () => set({ folioContext: null }),
}))
