'use client'

import * as React from 'react'
import { Plus, Users, Briefcase, Clock } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface JobOpening {
  id: string
  position: string
  department: string
  type: 'Full-time' | 'Part-time' | 'Contract'
  applicants: number
  status: 'Open' | 'Closed' | 'Draft'
  postedDate: string
  pipeline: { applied: number; screening: number; interview: number; offer: number }
}

const jobsData: JobOpening[] = [
  {
    id: 'JOB-001',
    position: 'Front Desk Agent',
    department: 'Front Office',
    type: 'Full-time',
    applicants: 24,
    status: 'Open',
    postedDate: '2025-01-10',
    pipeline: { applied: 24, screening: 12, interview: 6, offer: 2 },
  },
  {
    id: 'JOB-002',
    position: 'Executive Chef',
    department: 'Food & Beverage',
    type: 'Full-time',
    applicants: 8,
    status: 'Open',
    postedDate: '2025-01-05',
    pipeline: { applied: 8, screening: 5, interview: 3, offer: 1 },
  },
  {
    id: 'JOB-003',
    position: 'Housekeeping Supervisor',
    department: 'Housekeeping',
    type: 'Full-time',
    applicants: 15,
    status: 'Open',
    postedDate: '2025-01-12',
    pipeline: { applied: 15, screening: 8, interview: 4, offer: 0 },
  },
  {
    id: 'JOB-004',
    position: 'Spa Therapist',
    department: 'Spa & Wellness',
    type: 'Part-time',
    applicants: 18,
    status: 'Open',
    postedDate: '2025-01-08',
    pipeline: { applied: 18, screening: 10, interview: 5, offer: 1 },
  },
  {
    id: 'JOB-005',
    position: 'Night Auditor',
    department: 'Front Office',
    type: 'Full-time',
    applicants: 6,
    status: 'Closed',
    postedDate: '2024-12-15',
    pipeline: { applied: 6, screening: 4, interview: 2, offer: 1 },
  },
  {
    id: 'JOB-006',
    position: 'Events Coordinator',
    department: 'Events & Banquet',
    type: 'Full-time',
    applicants: 11,
    status: 'Draft',
    postedDate: '2025-01-18',
    pipeline: { applied: 0, screening: 0, interview: 0, offer: 0 },
  },
  {
    id: 'JOB-007',
    position: 'Bartender',
    department: 'Food & Beverage',
    type: 'Part-time',
    applicants: 22,
    status: 'Open',
    postedDate: '2025-01-14',
    pipeline: { applied: 22, screening: 14, interview: 7, offer: 2 },
  },
  {
    id: 'JOB-008',
    position: 'Maintenance Technician',
    department: 'Engineering',
    type: 'Full-time',
    applicants: 9,
    status: 'Open',
    postedDate: '2025-01-11',
    pipeline: { applied: 9, screening: 5, interview: 2, offer: 0 },
  },
]

const pipelineSteps = [
  { key: 'applied' as const, label: 'Applied', color: 'bg-sky-500' },
  { key: 'screening' as const, label: 'Screening', color: 'bg-amber-500' },
  { key: 'interview' as const, label: 'Interview', color: 'bg-violet-500' },
  { key: 'offer' as const, label: 'Offer', color: 'bg-emerald-500' },
]

function StatusBadge({ status }: { status: JobOpening['status'] }) {
  const variant = status === 'Open'
    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : status === 'Closed'
      ? 'bg-slate-100 text-slate-600 border-slate-200'
      : 'bg-amber-100 text-amber-700 border-amber-200'

  return (
    <Badge variant="outline" className={`${variant} font-medium`}>
      {status}
    </Badge>
  )
}

function TypeBadge({ type }: { type: JobOpening['type'] }) {
  const variant = type === 'Full-time'
    ? 'bg-blue-50 text-blue-700 border-blue-200'
    : type === 'Part-time'
      ? 'bg-purple-50 text-purple-700 border-purple-200'
      : 'bg-orange-50 text-orange-700 border-orange-200'

  return (
    <Badge variant="outline" className={`${variant} text-xs`}>
      {type}
    </Badge>
  )
}

export function RecruitmentView() {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Recruitment</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage job openings and track applicant pipeline</p>
        </div>
        <Button>
          <Plus className="mr-2 size-4" />
          Post Job
        </Button>
      </div>

      {/* Job Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {jobsData.map((job) => {
          const totalPipeline = job.pipeline.applied || 1
          const maxPipeline = Math.max(job.pipeline.applied, job.pipeline.screening, job.pipeline.interview, job.pipeline.offer)

          return (
            <Card key={job.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base font-semibold truncate">{job.position}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">{job.department}</p>
                  </div>
                  <StatusBadge status={job.status} />
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 flex-1">
                <div className="flex items-center gap-3 text-sm">
                  <TypeBadge type={job.type} />
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Briefcase className="size-3.5" />
                    {job.applicants} applicants
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="size-3.5" />
                    {job.postedDate}
                  </span>
                </div>

                {/* Pipeline Progress */}
                {job.status !== 'Draft' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Applicant Pipeline</span>
                      <span className="font-medium text-foreground">{job.pipeline.offer} offers</span>
                    </div>
                    <div className="space-y-1.5">
                      {pipelineSteps.map((step) => {
                        const width = maxPipeline > 0 ? (job.pipeline[step.key] / maxPipeline) * 100 : 0
                        return (
                          <div key={step.key} className="flex items-center gap-2">
                            <span className="w-16 text-xs text-muted-foreground shrink-0">{step.label}</span>
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn('h-full rounded-full transition-all', step.color)}
                                style={{ width: `${width}%` }}
                              />
                            </div>
                            <span className="w-6 text-xs font-medium text-right tabular-nums">{job.pipeline[step.key]}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}