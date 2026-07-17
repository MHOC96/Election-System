import { Check } from 'lucide-react'
import type { ElectionPhase } from '@/types/api'
import { getElectionRailStepIndex, RAIL_STEPS } from '@/lib/election-lifecycle-ui'
import { cn } from '@/lib/utils'

interface ElectionLifecycleRailProps {
  phase: ElectionPhase
  className?: string
}

function RailStep({
  index,
  label,
  isComplete,
  isCurrent,
}: {
  index: number
  label: string
  isComplete: boolean
  isCurrent: boolean
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors',
          isComplete && 'border-primary bg-primary text-primary-foreground shadow-sm',
          isCurrent && 'border-primary bg-primary/10 text-primary ring-4 ring-primary/15',
          !isComplete && !isCurrent && 'border-muted-foreground/25 bg-muted/40 text-muted-foreground',
        )}
        aria-current={isCurrent ? 'step' : undefined}
      >
        {isComplete ? <Check className="h-4 w-4" aria-hidden="true" /> : <span>{index + 1}</span>}
      </div>
      <span
        className={cn(
          'min-w-0 text-sm font-medium leading-snug',
          isCurrent ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {label}
      </span>
    </div>
  )
}

export function ElectionLifecycleRail({ phase, className }: ElectionLifecycleRailProps) {
  const activeIndex = getElectionRailStepIndex(phase)

  return (
    <nav aria-label="Election progress" className={cn('w-full min-w-0', className)}>
      <ol className="flex flex-col gap-2 lg:hidden">
        {RAIL_STEPS.map((step, index) => {
          const isComplete = index < activeIndex
          const isCurrent = index === activeIndex
          return (
            <li
              key={step.label}
              className={cn(
                'rounded-xl border px-3 py-2.5',
                isCurrent && 'border-primary/30 bg-primary/5 dark:bg-primary/10',
                isComplete && 'border-success/25 bg-success/5 dark:bg-success/10',
                !isComplete && !isCurrent && 'border-border/80 bg-card/40 dark:bg-card/50',
              )}
            >
              <RailStep
                index={index}
                label={step.label}
                isComplete={isComplete}
                isCurrent={isCurrent}
              />
            </li>
          )
        })}
      </ol>

      <ol className="hidden items-center gap-0 lg:flex">
        {RAIL_STEPS.map((step, index) => {
          const isComplete = index < activeIndex
          const isCurrent = index === activeIndex
          const isLast = index === RAIL_STEPS.length - 1

          return (
            <li key={step.label} className="flex min-w-0 flex-1 items-center">
              <div className="flex min-w-0 flex-col items-center gap-1.5 px-1">
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors',
                    isComplete && 'border-primary bg-primary text-primary-foreground shadow-sm',
                    isCurrent && 'border-primary bg-primary/10 text-primary ring-4 ring-primary/15',
                    !isComplete &&
                      !isCurrent &&
                      'border-muted-foreground/25 bg-muted/40 text-muted-foreground',
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isComplete ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    'max-w-[6.5rem] truncate text-center text-xs font-medium leading-tight xl:max-w-none',
                    isCurrent ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </span>
              </div>
              {!isLast ? (
                <div
                  className={cn(
                    'mx-1 mb-6 h-0.5 min-w-[0.35rem] flex-1 rounded-full',
                    index < activeIndex ? 'bg-primary' : 'bg-border',
                  )}
                  aria-hidden="true"
                />
              ) : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
