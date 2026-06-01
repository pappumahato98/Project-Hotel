import { create } from 'zustand'

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

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  token: null,
  login: (user, token) => set({ user, isAuthenticated: true, token }),
  logout: () => set({ user: null, isAuthenticated: false, token: null }),
  updateUser: (updates) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : null,
    })),
}))

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
