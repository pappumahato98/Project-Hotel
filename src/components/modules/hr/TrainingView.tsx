'use client'

import * as React from 'react'
import { Plus, Users, Clock, BookOpen, Calendar, Award } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface TrainingSession {
  id: string
  courseName: string
  instructor: string
  date: string
  duration: string
  enrolled: number
  maxCapacity: number
  status: 'Upcoming' | 'In Progress' | 'Completed' | 'Cancelled'
  category: string
}

const trainingData: TrainingSession[] = [
  {
    id: 'TR-001',
    courseName: 'Guest Service Excellence',
    instructor: 'Victoria Hartwell',
    date: '2025-02-03',
    duration: '3 hours',
    enrolled: 18,
    maxCapacity: 25,
    status: 'Upcoming',
    category: 'Service Standards',
  },
  {
    id: 'TR-002',
    courseName: 'Fire Safety & Emergency Procedures',
    instructor: 'Captain Mark Reynolds',
    date: '2025-01-28',
    duration: '2 hours',
    enrolled: 42,
    maxCapacity: 45,
    status: 'Upcoming',
    category: 'Safety & Compliance',
  },
  {
    id: 'TR-003',
    courseName: 'Food Hygiene Level 2',
    instructor: 'Dr. Elena Vasquez',
    date: '2025-01-25',
    duration: '4 hours',
    enrolled: 20,
    maxCapacity: 20,
    status: 'In Progress',
    category: 'F&B Compliance',
  },
  {
    id: 'TR-004',
    courseName: 'Revenue Management Fundamentals',
    instructor: 'Michael Sterling',
    date: '2025-02-10',
    duration: '2 hours',
    enrolled: 8,
    maxCapacity: 15,
    status: 'Upcoming',
    category: 'Professional Development',
  },
  {
    id: 'TR-005',
    courseName: 'Conflict Resolution & De-escalation',
    instructor: 'Dr. Patricia Moore',
    date: '2025-02-15',
    duration: '3 hours',
    enrolled: 12,
    maxCapacity: 20,
    status: 'Upcoming',
    category: 'Soft Skills',
  },
  {
    id: 'TR-006',
    courseName: 'PMS System Training (Opera)',
    instructor: 'IT Dept — Kevin Park',
    date: '2025-01-20',
    duration: '5 hours',
    enrolled: 15,
    maxCapacity: 15,
    status: 'Completed',
    category: 'Technical Skills',
  },
  {
    id: 'TR-007',
    courseName: 'Housekeeping Standards & Best Practices',
    instructor: 'Supervisor Anna Lindström',
    date: '2025-02-20',
    duration: '2.5 hours',
    enrolled: 22,
    maxCapacity: 30,
    status: 'Upcoming',
    category: 'Operations',
  },
  {
    id: 'TR-008',
    courseName: 'Wine & Beverage Knowledge',
    instructor: 'Sommelier Laurent Dubois',
    date: '2025-02-08',
    duration: '2 hours',
    enrolled: 10,
    maxCapacity: 12,
    status: 'Upcoming',
    category: 'F&B Skills',
  },
  {
    id: 'TR-009',
    courseName: 'First Aid & CPR Certification',
    instructor: 'Red Cross Instructor',
    date: '2025-01-15',
    duration: '6 hours',
    enrolled: 20,
    maxCapacity: 20,
    status: 'Completed',
    category: 'Safety & Compliance',
  },
]

function StatusBadge({ status }: { status: TrainingSession['status'] }) {
  const variant = status === 'Upcoming'
    ? 'bg-sky-100 text-sky-700 border-sky-200'
    : status === 'In Progress'
      ? 'bg-amber-100 text-amber-700 border-amber-200'
      : status === 'Completed'
        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
        : 'bg-red-100 text-red-700 border-red-200'

  return (
    <Badge variant="outline" className={`${variant} font-medium`}>
      {status}
    </Badge>
  )
}

export function TrainingView() {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Training & Development</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage training sessions and employee development programs</p>
        </div>
        <Button>
          <Plus className="mr-2 size-4" />
          Schedule Training
        </Button>
      </div>

      {/* Training Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {trainingData.map((session) => {
          const capacityPercent = Math.round((session.enrolled / session.maxCapacity) * 100)
          const isFull = session.enrolled >= session.maxCapacity

          return (
            <Card key={session.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base font-semibold leading-tight">{session.courseName}</CardTitle>
                    <Badge variant="secondary" className="mt-1.5 text-xs font-normal">
                      {session.category}
                    </Badge>
                  </div>
                  <StatusBadge status={session.status} />
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <BookOpen className="size-3.5 shrink-0" />
                    <span className="truncate">{session.instructor}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="size-3.5 shrink-0" />
                    {session.date}
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="size-3.5 shrink-0" />
                    {session.duration}
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="size-3.5 shrink-0" />
                    {session.enrolled}/{session.maxCapacity}
                  </div>
                </div>

                {/* Capacity Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Capacity</span>
                    <span className={isFull ? 'font-medium text-amber-600' : 'text-muted-foreground'}>
                      {capacityPercent}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isFull
                          ? 'bg-amber-500'
                          : capacityPercent >= 75
                            ? 'bg-amber-400'
                            : 'bg-emerald-500'
                      }`}
                      style={{ width: `${capacityPercent}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}