'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, Circle, ArrowRight, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GuideStep {
  id: string
  number: number
  title: string
  description: string
}

const STEPS: GuideStep[] = [
  {
    id: 'dashboard',
    number: 1,
    title: 'Dashboard Overview',
    description:
      'The Dashboard gives you a real-time overview of your hotel operations including KPIs, revenue metrics, occupancy rates, and quick actions. Navigate to Dashboard from the sidebar to see your hotel\'s current status.',
  },
  {
    id: 'reservations',
    number: 2,
    title: 'Managing Reservations',
    description:
      'The Front Desk module handles all guest reservations. Navigate to Front Desk > Reservations to create, edit, or manage bookings. Use the Calendar view to see room availability at a glance.',
  },
  {
    id: 'checkin-checkout',
    number: 3,
    title: 'Guest Check-in & Check-out',
    description:
      'Use Front Desk > Arrivals to process guest check-ins with preferences capture and key card issuance. Front Desk > Departures handles check-outs with express checkout, late checkout options, and folio review.',
  },
  {
    id: 'rooms',
    number: 4,
    title: 'Room Management',
    description:
      'The Room Management module tracks all room statuses across floors. Use Room Board to see room conditions, and Room Types to manage room configurations and rate plans.',
  },
  {
    id: 'operations',
    number: 5,
    title: 'Operations & Reports',
    description:
      'Operations handles night audits, day close procedures, and cashier shifts. Use Accounting for financial reports, journal entries, and ledger management.',
  },
]

export function GettingStartedView() {
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())

  const completedCount = completedSteps.size
  const totalSteps = STEPS.length
  const allComplete = completedCount === totalSteps
  const progressPercent = (completedCount / totalSteps) * 100

  const toggleStep = (stepId: string) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev)
      if (next.has(stepId)) {
        next.delete(stepId)
      } else {
        next.add(stepId)
      }
      return next
    })
  }

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card className="border-dashed">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {allComplete ? (
                <Sparkles className="h-5 w-5 text-amber-500" />
              ) : (
                <span className="text-sm font-medium text-muted-foreground">
                  Progress
                </span>
              )}
              <span className="text-sm font-semibold">
                {allComplete
                  ? 'Congratulations! You\'ve completed the getting started guide!'
                  : `Step ${completedCount} of ${totalSteps} complete`}
              </span>
            </div>
            <span className="text-sm text-muted-foreground font-medium">
              {Math.round(progressPercent)}%
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          {allComplete && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span>
                You&apos;re all set! You now know the basics of Meridian PMS. Explore each module
                to discover more advanced features.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Steps */}
      <div className="space-y-4">
        {STEPS.map((step, index) => {
          const isCompleted = completedSteps.has(step.id)
          return (
            <Card
              key={step.id}
              className={cn(
                'transition-all duration-200',
                isCompleted && 'bg-emerald-50/50 border-emerald-200/60 dark:bg-emerald-950/20 dark:border-emerald-800/40'
              )}
            >
              <CardContent className="p-5">
                <div className="flex gap-4">
                  {/* Step number / connector */}
                  <div className="flex flex-col items-center">
                    <button
                      onClick={() => toggleStep(step.id)}
                      className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors cursor-pointer',
                        isCompleted
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-muted-foreground/30 bg-background text-muted-foreground'
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        step.number
                      )}
                    </button>
                    {index < STEPS.length - 1 && (
                      <div
                        className={cn(
                          'w-0.5 h-full min-h-[20px] mt-2 rounded-full transition-colors',
                          isCompleted ? 'bg-emerald-500' : 'bg-muted-foreground/20'
                        )}
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-0.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5">
                        <h3
                          className={cn(
                            'font-semibold text-base transition-colors',
                            isCompleted && 'text-emerald-700 dark:text-emerald-400'
                          )}
                        >
                          {step.title}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 pt-0.5">
                        <Checkbox
                          checked={isCompleted}
                          onCheckedChange={() => toggleStep(step.id)}
                          aria-label={`Mark ${step.title} as done`}
                        />
                      </div>
                    </div>
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
