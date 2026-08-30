import {
  CheckCircle2,
  CircleDashed,
  ClipboardCheck,
  LoaderCircle,
  Send,
  XCircle,
} from 'lucide-react'
import type { CandidateApplication } from '@/api/applications'
import type { ElectionPhase } from '@/types/api'
import { cn, formatDate } from '@/lib/utils'

export type TimelineStepState = 'complete' | 'current' | 'upcoming' | 'rejected'

export interface ApplicationTimelineStep {
  id: string
  label: string
  description: string
  state: TimelineStepState
  timestamp?: string
}

function getDecisionCopy(
  status: CandidateApplication['status'],
  phase: ElectionPhase | undefined,
): { label: string; description: string; state: TimelineStepState } {
  if (status === 'PENDING_REVIEW') {
    return {
      label: 'Decision',
      description: 'The committee will publish accept or reject here.',
      state: 'upcoming',
    }
  }

  if (status === 'APPROVED') {
    if (phase === 'READY_FOR_VOTING') {
      return {
        label: 'Active on ballot',
        description: 'You are approved and listed for voting when the ballot opens.',
        state: 'complete',
      }
    }
    if (phase === 'VOTING_CLOSED') {
      return {
        label: 'Candidacy complete',
        description: 'Voting has ended. Results will be published when available.',
        state: 'complete',
      }
    }
    if (phase === 'VOTING_OPEN') {
      return {
        label: 'On the ballot',
        description: 'Members can vote for your position while voting is open.',
        state: 'complete',
      }
    }
    return {
      label: 'Approved',
      description: 'Your application was accepted for this executive position.',
      state: 'complete',
    }
  }

  if (status === 'REJECTED') {
    return {
      label: 'Not approved',
      description: 'The committee reviewed your application and did not accept it.',
      state: 'rejected',
    }
  }

  if (status === 'WITHDRAWN') {
    return {
      label: 'Withdrawn',
      description: 'This application is no longer active.',
      state: 'rejected',
    }
  }

  return {
    label: 'Decision',
    description: 'Awaiting committee decision.',
    state: 'upcoming',
  }
}

export function buildApplicationTimelineSteps(
  application: CandidateApplication,
  phase?: ElectionPhase,
): ApplicationTimelineStep[] {
  const reviewState: TimelineStepState =
    application.status === 'PENDING_REVIEW'
      ? 'current'
      : application.status === 'DRAFT'
        ? 'upcoming'
        : 'complete'

  const reviewDescription =
    application.status === 'PENDING_REVIEW'
      ? 'The election committee is reviewing your documents and eligibility.'
      : application.status === 'REJECTED' || application.status === 'APPROVED'
        ? 'Committee review is complete.'
        : 'Review begins after your application is submitted.'

  const decision = getDecisionCopy(application.status, phase)

  return [
    {
      id: 'submitted',
      label: 'Submitted',
      description: 'Your application and documents were received.',
      state: 'complete',
      timestamp: application.submitted_at,
    },
    {
      id: 'reviewing',
      label: 'Under review',
      description: reviewDescription,
      state: reviewState,
    },
    {
      id: 'decision',
      label: decision.label,
      description: decision.description,
      state: decision.state,
    },
  ]
}

function StepIcon({ state }: { state: TimelineStepState }) {
  if (state === 'complete') {
    return <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
  }
  if (state === 'current') {
    return <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
  }
  if (state === 'rejected') {
    return <XCircle className="h-4 w-4" aria-hidden="true" />
  }
  return <CircleDashed className="h-4 w-4" aria-hidden="true" />
}

function stepMarkerClass(state: TimelineStepState): string {
  switch (state) {
    case 'complete':
      return 'border-success/30 bg-success/12 text-success shadow-[0_0_0_4px_hsl(var(--success)/0.12)] dark:bg-success/18 dark:shadow-[0_0_0_4px_hsl(var(--success)/0.18)]'
    case 'current':
      return 'border-primary/35 bg-primary/12 text-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.14)] dark:bg-primary/18 dark:shadow-[0_0_0_4px_hsl(var(--primary)/0.22)]'
    case 'rejected':
      return 'border-destructive/35 bg-destructive/12 text-destructive shadow-[0_0_0_4px_hsl(var(--destructive)/0.12)] dark:bg-destructive/18'
    default:
      return 'border-border/80 bg-muted/50 text-muted-foreground dark:bg-muted/30'
  }
}

function connectorClass(state: TimelineStepState): string {
  if (state === 'complete') {
    return 'bg-success/45 dark:bg-success/35'
  }
  if (state === 'rejected') {
    return 'bg-destructive/35'
  }
  if (state === 'current') {
    return 'bg-gradient-to-b from-primary/40 to-border/40'
  }
  return 'bg-border/70 dark:bg-border/50'
}

interface ApplicationReviewTimelineProps {
  steps: ApplicationTimelineStep[]
  className?: string
}

export function ApplicationReviewTimeline({ steps, className }: ApplicationReviewTimelineProps) {
  return (
    <div className={cn('w-full', className)}>
      <div className="mb-5 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-inset ring-primary/20 dark:bg-primary/15 dark:ring-primary/30">
          <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <p className="portal-heading text-sm font-semibold sm:text-base">Application progress</p>
          <p className="portal-subtle text-xs sm:text-sm">Submitted, review, and final decision</p>
        </div>
      </div>

      <ol className="space-y-0" aria-label="Application review progress">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1

          return (
            <li key={step.id} className={cn('relative flex gap-4', !isLast && 'pb-5')}>
              {!isLast ? (
                <span
                  aria-hidden
                  className={cn(
                    'absolute left-[1.125rem] top-10 bottom-0 w-0.5 -translate-x-1/2',
                    connectorClass(step.state),
                  )}
                />
              ) : null}

              <span
                className={cn(
                  'relative z-[1] mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border',
                  stepMarkerClass(step.state),
                  step.state === 'current' &&
                    'after:absolute after:inset-0 after:animate-ping after:rounded-full after:bg-primary/20 after:content-[""]',
                )}
                aria-hidden="true"
              >
                <StepIcon state={step.state} />
              </span>

              <div
                className={cn(
                  'min-w-0 flex-1 rounded-xl border border-border/70 bg-card/85 p-4 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.75)] dark:border-border/80 dark:bg-card/55 dark:shadow-[inset_0_1px_0_hsl(var(--foreground)/0.05)]',
                  step.state === 'current' && 'ring-1 ring-primary/15 dark:ring-primary/25',
                  step.state === 'rejected' && 'ring-1 ring-destructive/15',
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="portal-heading text-sm font-semibold leading-snug sm:text-base">
                    {step.label}
                  </p>
                  {step.state === 'current' ? (
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary ring-1 ring-inset ring-primary/20 dark:bg-primary/15">
                      In progress
                    </span>
                  ) : null}
                  {step.state === 'complete' && step.id === 'decision' ? (
                    <span className="inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-success ring-1 ring-inset ring-success/20 dark:bg-success/14">
                      Complete
                    </span>
                  ) : null}
                  {step.state === 'rejected' ? (
                    <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-destructive ring-1 ring-inset ring-destructive/20 dark:bg-destructive/14">
                      Closed
                    </span>
                  ) : null}
                </div>
                <p className="portal-subtle mt-1.5 text-pretty text-sm leading-relaxed">
                  {step.description}
                </p>
                {step.timestamp ? (
                  <p className="portal-subtle mt-2.5 flex items-center gap-1.5 text-[11px] tabular-nums">
                    <Send className="h-3 w-3 shrink-0 opacity-70" aria-hidden="true" />
                    Submitted {formatDate(step.timestamp)}
                  </p>
                ) : null}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
