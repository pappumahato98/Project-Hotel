import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { toDateOnly } from '@/lib/format'
import { getOrSet } from '@/lib/cache'
import { requireAuth } from '@/lib/security/auth-helpers'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  try {
    const data = await getOrSet('housekeeping:rooms', async () => {
    const { searchParams } = new URL(request.url)
    const hkStatus = searchParams.get('hkStatus')
    const roomTypeId = searchParams.get('roomTypeId')
    const priority = searchParams.get('priority')
    const floor = searchParams.get('floor')
    const search = searchParams.get('search')

    // Get today's date for arrival/departure checks
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    // Fetch all rooms with type info
    const roomsWhere: Prisma.RoomWhereInput = {
      status: { notIn: ['out_of_inventory'] },
    }

    if (roomTypeId) roomsWhere.typeId = roomTypeId
    if (floor) roomsWhere.floor = parseInt(floor)
    if (search) {
      roomsWhere.OR = [
        { number: { contains: search } },
        { type: { name: { contains: search } } },
        { type: { code: { contains: search } } },
      ]
    }

    const rooms = await db.room.findMany({
      where: roomsWhere,
      include: {
        type: { select: { id: true, name: true, code: true, bedConfig: true, baseOccupancy: true, maxOccupancy: true } },
      },
      orderBy: [{ floor: 'asc' }, { number: 'asc' }],
    })

    // Fetch all active HK tasks
    const allTasks = await db.hkTask.findMany({
      where: {
        status: { in: ['pending', 'assigned', 'in_progress', 'cleaned', 'inspected', 'failed'] },
      },
      include: {
        room: { select: { id: true } },
      },
      orderBy: { scheduledTime: 'desc' },
    })

    // Map tasks by roomId (keep latest task per room)
    const taskByRoom = new Map<string, (typeof allTasks)[0]>()
    for (const task of allTasks) {
      const existing = taskByRoom.get(task.roomId)
      if (!existing || new Date(task.scheduledTime) > new Date(existing.scheduledTime)) {
        taskByRoom.set(task.roomId, task)
      }
    }

    // Fetch current reservations for rooms (checked_in, or arriving today)
    const reservations = await db.reservation.findMany({
      where: {
        status: { in: ['confirmed', 'checked_in', 'tentative'] },
        OR: [
          { checkIn: { lte: todayEnd }, checkOut: { gt: todayStart } },
        ],
        roomId: { not: null },
      },
      include: {
        guest: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { checkIn: 'asc' },
    })

    // Map reservations by roomId
    const reservationByRoom = new Map<string, (typeof reservations)[0]>()
    for (const res of reservations) {
      if (!res.roomId) continue
      const existing = reservationByRoom.get(res.roomId)
      if (!existing || new Date(res.checkIn) < new Date(existing.checkIn)) {
        reservationByRoom.set(res.roomId, res)
      }
    }

    // Build table rows
    let rows = rooms.map((room) => {
      const task = taskByRoom.get(room.id)
      const reservation = reservationByRoom.get(room.id)

      // Determine housekeeping display status based on room status and task
      let hkDisplayStatus: string
      switch (room.status) {
        case 'vacant_clean':
          hkDisplayStatus = 'clean'
          break
        case 'vacant_dirty':
          hkDisplayStatus = 'dirty'
          break
        case 'cleaning':
          hkDisplayStatus = 'cleaning'
          break
        case 'inspected':
          hkDisplayStatus = 'inspected'
          break
        case 'on_change':
          hkDisplayStatus = 'change_over'
          break
        default:
          hkDisplayStatus = room.status
      }

      // If there's an active task, derive status from task instead
      if (task) {
        switch (task.status) {
          case 'pending':
            hkDisplayStatus = 'pending'
            break
          case 'assigned':
            hkDisplayStatus = 'assigned'
            break
          case 'in_progress':
            hkDisplayStatus = 'cleaning'
            break
          case 'cleaned':
            hkDisplayStatus = 'cleaned'
            break
          case 'inspected':
            hkDisplayStatus = 'inspected'
            break
          case 'failed':
            hkDisplayStatus = 'failed'
            break
        }
      }

      // Determine reservation display status
      let reservationStatus: string
      if (reservation) {
        if (reservation.status === 'checked_in') {
          reservationStatus = 'occupied'
        } else if (reservation.status === 'confirmed') {
          const ci = new Date(reservation.checkIn)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          if (ci.toDateString() === today.toDateString()) {
            reservationStatus = 'due_in'
          } else if (ci > today) {
            reservationStatus = 'confirmed'
          } else {
            reservationStatus = 'occupied'
          }
        } else {
          reservationStatus = reservation.status
        }
      } else {
        reservationStatus = 'vacant'
      }

      // Guest name for comments
      const guestName = reservation?.guest
        ? `${reservation.guest.firstName} ${reservation.guest.lastName}`.trim()
        : null

      return {
        roomId: room.id,
        roomNumber: room.number,
        floor: room.floor,
        wing: room.wing,
        roomTypeName: room.type.name,
        roomTypeCode: room.type.code,
        bedConfig: room.type.bedConfig,
        maxOccupancy: room.type.maxOccupancy,
        roomStatus: room.status,
        hkDisplayStatus,
        hkTaskId: task?.id || null,
        priority: task?.priority || 'normal',
        assignedTo: task?.assignedTo || null,
        taskNotes: task?.notes || null,
        scheduledTime: task?.scheduledTime || null,
        estimatedMinutes: task?.estimatedMinutes || null,
        reservationStatus,
        guestName,
        specialRequests: reservation?.specialRequests || null,
        confirmationNo: reservation?.confirmationNo || null,
        hasTask: !!task,
      }
    })

    // Apply HK status filter
    if (hkStatus) {
      rows = rows.filter((r) => r.hkDisplayStatus === hkStatus)
    }

    // Apply priority filter
    if (priority) {
      rows = rows.filter((r) => r.priority === priority)
    }

    return { rows }
    }, 120000)
    return NextResponse.json(data)
  } catch (error) {
    console.error('HK Rooms API error:', error)
    return NextResponse.json({ error: 'Failed to fetch room data' }, { status: 500 })
  }
}