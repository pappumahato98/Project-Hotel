import { create } from 'zustand'

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
