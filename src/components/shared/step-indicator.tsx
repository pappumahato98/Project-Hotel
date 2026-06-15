'use client'

import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

export interface StepConfig {
  label: string
  description?: string
  icon: React.ComponentType<{ className?: string }>
  optional?: boolean
}

interface StepIndicatorProps {
  steps: StepConfig[]
  currentStep: number
  onStepClick?: (step: number) => void
  completedSteps?: Set<number>
}

export function StepIndicator({
  steps,
  currentStep,
  onStepClick,
  completedSteps,
}: StepIndicatorProps) {
  const completed = completedSteps || new Set<number>()

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-2.5">
      <div className="flex items-start justify-between max-w-3xl mx-auto">
        {steps.map((step, idx) => {
          const stepNum = idx + 1
          const isCompleted = completed.has(stepNum) || currentStep > stepNum
          const isCurrent = currentStep === stepNum
          const isUpcoming = stepNum > currentStep
          const Icon = step.icon

          return (
            <div key={stepNum} className="flex items-center flex-1 last:flex-none">
              {/* Step circle + label */}
              <button
                type="button"
                onClick={() => {
                  if (onStepClick && (isCompleted || isCurrent)) {
                    onStepClick(stepNum)
                  }
                }}
                disabled={!onStepClick || isUpcoming}
                className={cn(
                  'flex flex-col items-center gap-1.5 group min-w-0',
                  isUpcoming && 'opacity-40 cursor-not-allowed',
                  onStepClick && (isCompleted || isCurrent) && 'cursor-pointer'
                )}
              >
                {/* Circle */}
                <div
                  className={cn(
                    'relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-all duration-300',
                    isCurrent && [
                      'bg-amber-500 text-white shadow-lg shadow-amber-500/25',
                      'ring-4 ring-amber-500/15',
                    ],
                    isCompleted && !isCurrent && [
                      'bg-emerald-500 text-white',
                      'group-hover:bg-emerald-600',
                    ],
                    isUpcoming && [
                      'bg-muted text-muted-foreground border-2 border-dashed border-muted-foreground/30',
                    ],
                    !isCurrent && !isCompleted && !isUpcoming && [
                      'bg-muted text-muted-foreground',
                    ],
                  )}
                >
                  {isCompleted && !isCurrent ? (
                    <Check className="w-5 h-5 sm:w-5.5 sm:h-5.5" strokeWidth={3} />
                  ) : (
                    <Icon className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
                  )}
                  {/* Step number badge */}
                  <span
                    className={cn(
                      'absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-background',
                      isCurrent && 'bg-amber-500 text-white',
                      isCompleted && !isCurrent && 'bg-emerald-500 text-white',
                      isUpcoming && 'bg-muted text-muted-foreground',
                    )}
                  >
                    {isCompleted && !isCurrent ? (
                      <Check className="w-3 h-3" strokeWidth={3} />
                    ) : (
                      stepNum
                    )}
                  </span>
                </div>

                {/* Label */}
                <div className="text-center min-w-0">
                  <span
                    className={cn(
                      'text-[11px] sm:text-xs font-semibold leading-tight block',
                      isCurrent && 'text-amber-600 dark:text-amber-400',
                      isCompleted && !isCurrent && 'text-emerald-600 dark:text-emerald-400',
                      isUpcoming && 'text-muted-foreground',
                    )}
                  >
                    {step.label}
                  </span>
                  {step.optional && !isUpcoming && (
                    <span className="block text-[9px] sm:text-[10px] text-muted-foreground mt-0.5">
                      Optional
                    </span>
                  )}
                  {step.description && isCurrent && (
                    <span className="hidden sm:block text-[10px] text-muted-foreground mt-0.5 max-w-[120px] truncate">
                      {step.description}
                    </span>
                  )}
                </div>
              </button>

              {/* Connector line */}
              {idx < steps.length - 1 && (
                <div className="flex-1 mx-1.5 sm:mx-2.5 mt-4">
                  <div className="h-0.5 rounded-full transition-colors duration-500 relative">
                    <div className="absolute inset-0 bg-border rounded-full" />
                    <div
                      className={cn(
                        'absolute inset-y-0 left-0 rounded-full transition-all duration-500',
                        isCompleted
                          ? 'w-full bg-emerald-500'
                          : isCurrent
                            ? 'w-1/2 bg-amber-500'
                            : 'w-0 bg-transparent',
                      )}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Step content wrapper that provides a consistent card layout for each step.
 */
interface StepContentProps {
  title: string
  description?: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}

export function StepContent({ title, description, icon: Icon, children }: StepContentProps) {
  return (
    <div className="space-y-3">
      {/* Step header */}
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {/* Step body */}
      {children}
    </div>
  )
}

/**
 * Navigation footer for step wizards.
 */
interface StepNavProps {
  currentStep: number
  totalSteps: number
  onBack: () => void
  onNext?: () => void
  onSubmit?: () => void
  submitLabel?: string
  isSubmitting?: boolean
  nextDisabled?: boolean
  submitDisabled?: boolean
  hideNext?: boolean
}

export function StepNav({
  currentStep,
  totalSteps,
  onBack,
  onNext,
  onSubmit,
  submitLabel = 'Submit',
  isSubmitting = false,
  nextDisabled = false,
  submitDisabled = false,
  hideNext = false,
}: StepNavProps) {
  const isLastStep = currentStep === totalSteps

  return (
    <div className="shrink-0 sticky bottom-0 z-10 border-t bg-card/95 backdrop-blur-sm p-3 sm:px-6 shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        <div>
          {currentStep > 1 && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="m15 18-6-6 6-6" />
              </svg>
              Back
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Step counter */}
          <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
            Step {currentStep} of {totalSteps}
          </span>

          {!isLastStep && !hideNext && onNext && (
            <button
              type="button"
              onClick={onNext}
              disabled={nextDisabled}
              className={cn(
                'inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium transition-all',
                nextDisabled
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm hover:shadow-md active:scale-[0.98]',
              )}
            >
              Continue
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          )}

          {isLastStep && onSubmit && (
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitDisabled || isSubmitting}
              className={cn(
                'inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium transition-all',
                submitDisabled || isSubmitting
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm hover:shadow-md active:scale-[0.98]',
              )}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" strokeWidth={2.5} />
                  {submitLabel}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}