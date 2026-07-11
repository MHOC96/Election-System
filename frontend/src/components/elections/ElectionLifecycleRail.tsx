import { Check } from 'lucide-react'
import type { ElectionPhase } from '@/types/api'
import { getElectionRailStepIndex, RAIL_STEPS } from '@/lib/election-lifecycle-ui'
import { cn } from '@/lib/utils'

interface ElectionLifecycleRailProps {
  phase: ElectionPhase
  className?: string
}

export function ElectionLifecycleRail({ phase, className }: ElectionLifecycleRailProps) {
  const activeIndex = getElectionRailStepIndex(phase)

  return (
    <nav
      aria-label="Election progress"
      className={cn('w-full min-w-0', className)}
    >
      <ol className="flex items-center gap-0">
        {RAIL_STEPS.map((step, index) => {
          const isComplete = index < activeIndex
          const isCurrent = index === activeIndex
          const isLast = index === RAIL_STEPS.length - 1

          return (
            <li key={step.label} className="flex min-w-0 flex-1 items-center">
              <div className="flex min-w-0 flex-col items-center gap-1.5 px-0.5 sm:px-1">
                <div
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-colors sm:h-8 sm:w-8 sm:text-xs',
                    isComplete &&
                      'border-primary bg-primary text-primary-foreground shadow-sm',
                    isCurrent &&
                      'border-primary bg-primary/10 text-primary ring-4 ring-primary/15',
                    !isComplete &&
                      !isCurrent &&
                      'border-muted-foreground/25 bg-muted/40 text-muted-foreground',
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isComplete ? (
                    <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    'max-w-[4.5rem] truncate text-center text-[10px] font-medium leading-tight sm:max-w-none sm:text-xs',
                    isCurrent ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </span>
              </div>
              {!isLast ? (
                <div
                  className={cn(
                    'mx-0.5 mb-5 h-0.5 min-w-[0.35rem] flex-1 rounded-full sm:mx-1 sm:mb-6',
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
