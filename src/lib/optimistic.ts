/**
 * Optimistic Update Utilities for React Query Mutations
 *
 * Provides a factory function to add instant UI feedback to mutations
 * without waiting for the server response. On error, the snapshot is restored.
 *
 * Usage:
 *   const mutation = useMutation({
 *     mutationFn: (data) => apiFetch('/api/rooms/123', { method: 'PATCH', body: JSON.stringify(data) }),
 *     ...optimisticOptions({
 *       queryClient,
 *       queryKeys: [['rooms', 'board']],
 *       updateFn: (old) => old.map(r => r.id === '123' ? { ...r, status: 'occupied' } : r),
 *     }),
 *     onSuccess: () => invalidate.afterRoomStatusChange(queryClient),
 *   })
 */

import type { QueryClient, QueryKey } from '@tanstack/react-query'

// ─── Types ─────────────────────────────────────────────────────────────

type QueryData = unknown

interface OptimisticConfig<TData = unknown, TVariables = unknown> {
  /** React Query client instance */
  queryClient: QueryClient
  /** Query keys to optimistically update */
  queryKeys: QueryKey[]
  /**
   * How to transform the cached data optimistically.
   * Receives the current cached data and the mutation variables.
   * Return the new data to display immediately.
   */
  updateFn: (oldData: TData, variables: TVariables) => TData
  /**
   * Which query key to ACTIVELY refetch after the mutation settles
   * (success or error). Defaults to the first queryKey.
   */
  refetchOnSettle?: QueryKey
}

// ─── Core Factory ──────────────────────────────────────────────────────

/**
 * Creates `onMutate`, `onError`, and `onSettled` handlers for optimistic updates.
 * Spread these into your `useMutation({...})` config.
 *
 * The snapshot context is stored in a closure — no extra state needed.
 */
export function optimisticOptions<TData = unknown, TVariables = unknown>(
  config: OptimisticConfig<TData, TVariables>
) {
  const { queryClient, queryKeys, updateFn, refetchOnSettle } = config

  // The snapshot is shared between onMutate → onError via closure
  let snapshot: Map<string, QueryData> | null = null

  return {
    onMutate: async (variables: TVariables) => {
      // 1. Cancel any outgoing refetches so they don't overwrite our optimistic update
      const cancellations = queryKeys.map((key) =>
        queryClient.cancelQueries({ queryKey: key })
      )
      await Promise.all(cancellations)

      // 2. Snapshot current values
      snapshot = new Map()
      for (const key of queryKeys) {
        const data = queryClient.getQueryData<TData>(key)
        if (data !== undefined) {
          snapshot.set(JSON.stringify(key), data)
        }
      }

      // 3. Apply optimistic update to each matching query key
      for (const key of queryKeys) {
        const currentData = queryClient.getQueryData<TData>(key)
        if (currentData !== undefined) {
          queryClient.setQueryData<TData>(key, updateFn(currentData, variables))
        }
      }

      // Return snapshot for potential manual rollback
      return { snapshot }
    },

    onError: (_err: Error, _variables: TVariables, context?: { snapshot?: Map<string, QueryData> }) => {
      // 4. Rollback to snapshot on error
      if (snapshot) {
        for (const [keyStr, data] of snapshot.entries()) {
          const key = JSON.parse(keyStr) as QueryKey
          queryClient.setQueryData(key, data)
        }
      }
      // Also handle snapshot passed via context (if someone uses the return value)
      if (context?.snapshot && context.snapshot !== snapshot) {
        for (const [keyStr, data] of context.snapshot.entries()) {
          const key = JSON.parse(keyStr) as QueryKey
          queryClient.setQueryData(key, data)
        }
      }
    },

    onSettled: () => {
      // 5. Sync with server after mutation completes (success or error)
      const refetchKey = refetchOnSettle ?? queryKeys[0]
      if (refetchKey) {
        queryClient.invalidateQueries({
          queryKey: refetchKey,
          refetchType: 'active',
        })
      }
      snapshot = null
    },
  }
}

// ─── Domain-Specific Helpers ────────────────────────────────────────────

interface Room {
  id: string
  status: string
  [key: string]: unknown
}

interface RoomBoardData {
  floors?: { rooms: Room[] }[]
  rooms?: Room[]
}

/**
 * Optimistic room status change.
 * Updates room status in room board data structure.
 */
export function roomStatusOptimistic(
  queryClient: QueryClient,
  roomId: string,
  newStatus: string
) {
  return optimisticOptions<RoomBoardData, unknown>({
    queryClient,
    queryKeys: [['rooms', 'board'], ['rooms']],
    updateFn: (oldData, _vars) => {
      if (!oldData) return oldData

      // Handle floors-based board structure
      if (Array.isArray(oldData.floors)) {
        return {
          ...oldData,
          floors: oldData.floors.map((floor) => ({
            ...floor,
            rooms: floor.rooms?.map((room) =>
              room.id === roomId ? { ...room, status: newStatus } : room
            ) ?? floor.rooms,
          })),
        }
      }

      // Handle flat rooms array
      if (Array.isArray(oldData.rooms)) {
        return {
          ...oldData,
          rooms: oldData.rooms.map((room) =>
            room.id === roomId ? { ...room, status: newStatus } : room
          ),
        }
      }

      return oldData
    },
  })
}

interface Reservation {
  id: string
  status: string
  roomId?: string | null
  [key: string]: unknown
}

interface ReservationListData {
  items?: Reservation[]
  reservations?: Reservation[]
  data?: Reservation[]
}

/**
 * Optimistic reservation status change (check-in, check-out, cancel).
 */
export function reservationStatusOptimistic(
  queryClient: QueryClient,
  reservationId: string,
  newStatus: string,
  extraUpdates?: Partial<Reservation>
) {
  return optimisticOptions<ReservationListData, unknown>({
    queryClient,
    queryKeys: [['reservations'], ['arrivals'], ['in-house'], ['departures']],
    updateFn: (oldData, _vars) => {
      if (!oldData) return oldData

      const items = oldData.items ?? oldData.reservations ?? oldData.data ?? []
      if (!Array.isArray(items)) return oldData

      const updated = items.map((r) =>
        r.id === reservationId
          ? { ...r, status: newStatus, ...extraUpdates }
          : r
      )

      // Preserve the original data shape
      if (oldData.items) return { ...oldData, items: updated }
      if (oldData.reservations) return { ...oldData, reservations: updated }
      if (oldData.data) return { ...oldData, data: updated }
      return oldData
    },
  })
}

interface HkTask {
  id: string
  status: string
  priority?: string
  [key: string]: unknown
}

interface HkTaskListData {
  tasks?: HkTask[]
  items?: HkTask[]
  data?: HkTask[]
}

/**
 * Optimistic housekeeping task status change.
 */
export function hkTaskStatusOptimistic(
  queryClient: QueryClient,
  taskId: string,
  newStatus: string,
  extraUpdates?: Partial<HkTask>
) {
  return optimisticOptions<HkTaskListData, unknown>({
    queryClient,
    queryKeys: [['housekeeping-tasks'], ['housekeeping-rooms']],
    updateFn: (oldData, _vars) => {
      if (!oldData) return oldData

      const tasks = oldData.tasks ?? oldData.items ?? oldData.data ?? []
      if (!Array.isArray(tasks)) return oldData

      const updated = tasks.map((t) =>
        t.id === taskId
          ? { ...t, status: newStatus, ...extraUpdates }
          : t
      )

      if (oldData.tasks) return { ...oldData, tasks: updated }
      if (oldData.items) return { ...oldData, items: updated }
      if (oldData.data) return { ...oldData, data: updated }
      return oldData
    },
  })
}
