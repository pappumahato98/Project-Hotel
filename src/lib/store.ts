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
