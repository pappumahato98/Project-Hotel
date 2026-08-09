import { NEPAL_VAT_RATE } from '@/lib/nepal-standards'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiFetch } from '@/lib/api'

// ─── Auth State ────────────────────────────────────────────────
// Persisted in localStorage for instant restore on page load.
// Token refresh happens silently in the background.

interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  department: string
  position: string
  avatarUrl: string | null
  phone: string | null
  dateOfBirth: string | null
  gender: string | null
  address: string | null
  city: string | null
  country: string | null
  nationality: string | null
  idType: string | null
  idNumber: string | null
  twoFactorEnabled: boolean
  lastLoginAt: string | null
  createdAt: string
}

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  token: string | null
  _hasHydrated: boolean
  login: (user: AuthUser, token: string) => void
  logout: () => void
  updateUser: (updates: Partial<AuthUser>) => void
  _setHasHydrated: (v: boolean) => void
}

// Auth store — persisted to localStorage for instant restore.
// _hasHydrated is excluded from persistence (always starts false on server).
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      token: null,
      _hasHydrated: false,
      login: (user, token) => set({ user, isAuthenticated: true, token }),
      logout: () => set({ user: null, isAuthenticated: false, token: null }),
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
      _setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: 'meridian-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        token: state.token,
      }),
      onRehydrateStorage: () => (state) => {
        // Mark as hydrated immediately when localStorage restores
        if (state) {
          state._setHasHydrated(true)
        }
      },
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
interface NepaliStandards {
  dualCalendar: boolean
  holidayAlerts: boolean
  autoTaxRules: boolean
  foreignGuestRegistration: boolean
  tourismFee: number
  localBodyTaxRate: number
  datePrefixStyle: 'ad_only' | 'bs_only' | 'ad_bs' | 'none'
  currencyFormat: 'rs_only' | 'npr_only' | 'ru_matra'
}

interface UserPreferences {
  language: string
  currency: string
  timezone: string
  dateFormat: string
  notifications: boolean
  compactMode: boolean
  notifEmail: boolean
  notifPush: boolean
  notifInApp: boolean
  nepaliStandards: NepaliStandards
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
        dateFormat: 'YYYY/MM/DD',
        notifications: true,
        compactMode: false,
        notifEmail: true,
        notifPush: true,
        notifInApp: true,
        nepaliStandards: {
          dualCalendar: true,
          holidayAlerts: true,
          autoTaxRules: true,
          foreignGuestRegistration: true,
          tourismFee: 500,
          localBodyTaxRate: 0,
          datePrefixStyle: 'ad_bs',
          currencyFormat: 'rs_only',
        },
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
  taxRate: NEPAL_VAT_RATE,
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
          const data = await apiFetch('/api/settings')
          set({ settings: { ...DEFAULT_SETTINGS, ...data }, _loaded: true, _loading: false })
          return data
        } catch (err) {
          // 401 is expected when not authenticated — don't pollute console
          const msg = err instanceof Error ? err.message : ''
          if (!msg.includes('401') && !msg.includes('Authentication')) {
            console.error('Failed to sync settings from backend:', err)
          }
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
          const data = await apiFetch('/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          })
          set({ settings: { ...DEFAULT_SETTINGS, ...data }, _loaded: true })
          return data
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
    set((state) => {
      if (state.activeModule === module && state.activeSubModule === subModule) return state
      return {
        activeModule: module,
        activeSubModule: subModule,
        expandedItems: subModule && !state.expandedItems.includes(module)
          ? [...state.expandedItems, module]
          : state.expandedItems,
      }
    }),
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

// ─── Front Desk Context State ──────────────────────
// Used to pass context for New Reservation / Check-In flows

export interface CheckInSession {
  reservationId: string | null
  reservationData: Record<string, unknown> | null
  isDirectWalkIn: boolean
  walkInGuest: {
    firstName: string
    lastName: string
    email: string
    phone: string
    nationality: string
  } | null
  walkInDates: {
    checkIn: string
    checkOut: string
    adults: number
    children: number
  } | null
  startAtStep: number  // 1 for normal, 2 for express
}

interface FrontDeskContextState {
  prefillReservationId: string | null  // reservation ID to prefill in check-in
  setPrefillReservationId: (id: string | null) => void
  showNewReservation: boolean
  setShowNewReservation: (show: boolean) => void
  checkInSession: CheckInSession | null
  setCheckInSession: (session: CheckInSession | null) => void
  clearCheckInSession: () => void
}

export const useFrontDeskContextStore = create<FrontDeskContextState>((set) => ({
  prefillReservationId: null,
  setPrefillReservationId: (id) => set({ prefillReservationId: id }),
  showNewReservation: false,
  setShowNewReservation: (show) => set({ showNewReservation: show }),
  checkInSession: null,
  setCheckInSession: (session) => set({ checkInSession: session }),
  clearCheckInSession: () => set({ checkInSession: null }),
}))

// ─── Guest Ledger Context State ──────────────────────
// Used to pass guest context from any module → Guest Ledger view
export interface GuestLedgerContext {
  guestId: string
  guestName: string
}

interface GuestLedgerContextState {
  guestLedgerContext: GuestLedgerContext | null
  setGuestLedgerContext: (ctx: GuestLedgerContext | null) => void
  clearGuestLedgerContext: () => void
}

export const useGuestLedgerContextStore = create<GuestLedgerContextState>((set) => ({
  guestLedgerContext: null,
  setGuestLedgerContext: (ctx) => set({ guestLedgerContext: ctx }),
  clearGuestLedgerContext: () => set({ guestLedgerContext: null }),
}))

// ─── Reservation Context State ──────────────────────
// Used to pass reservation context from any module → Reservations view
export interface ReservationContext {
  reservationId: string
  confirmationNo?: string
}

interface ReservationContextState {
  reservationContext: ReservationContext | null
  setReservationContext: (ctx: ReservationContext | null) => void
  clearReservationContext: () => void
}

export const useReservationContextStore = create<ReservationContextState>((set) => ({
  reservationContext: null,
  setReservationContext: (ctx) => set({ reservationContext: ctx }),
  clearReservationContext: () => set({ reservationContext: null }),
}))

// ─── Front Desk Tabs State (persisted) ──────────────────────
interface FrontDeskTabsState {
  disabledSubModules: string[]
  toggleSubModule: (key: string) => void
  resetSubModules: () => void
}

export const useFrontDeskTabsStore = create<FrontDeskTabsState>()(
  persist(
    (set) => ({
      disabledSubModules: [],
      toggleSubModule: (key) =>
        set((state) => ({
          disabledSubModules: state.disabledSubModules.includes(key)
            ? state.disabledSubModules.filter((k) => k !== key)
            : [...state.disabledSubModules, key],
        })),
      resetSubModules: () => set({ disabledSubModules: [] }),
    }),
    {
      name: 'meridian-fd-tabs',
    }
  )
)
