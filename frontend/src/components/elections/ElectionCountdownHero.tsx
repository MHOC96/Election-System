import type { LucideIcon } from 'lucide-react'
import { CalendarClock, CheckCircle2, Circle, Sparkles, Vote } from 'lucide-react'
import { CountdownDisplay } from '@/components/shared/CountdownDisplay'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

export type CountdownVariant =
  | 'applications-upcoming'
  | 'applications-open'
  | 'voting-upcoming'
  | 'voting-open'

interface ElectionCountdownHeroProps {
  variant: CountdownVariant
  electionName: string
  targetAt: string | null
  className?: string
}

type VariantCopy = {
  eyebrow: string
  title: string
  description?: string
  targetPrefix: string
  modifier: string
  countdownLabel: string
  icon: LucideIcon
  showVotingTimeline?: boolean
}

const variantCopy: Record<CountdownVariant, VariantCopy> = {
  'applications-upcoming': {
    eyebrow: 'Candidate applications',
    title: 'Applications opening soon',
    targetPrefix: 'Opens',
    modifier: 'election-countdown--applications-upcoming',
    countdownLabel: 'Time until applications open',
    icon: Sparkles,
  },
  'applications-open': {
    eyebrow: 'Candidate applications',
    title: 'Applications are live',
    targetPrefix: 'Closes',
    modifier: 'election-countdown--applications-open',
    countdownLabel: 'Time remaining to apply',
    icon: Sparkles,
  },
  'voting-upcoming': {
    eyebrow: 'Ballot scheduled',
    title: 'Almost time to vote',
    description:
      'Candidates are confirmed. When the countdown ends, return to this page to choose your representatives.',
    targetPrefix: 'Voting begins',
    modifier: 'election-countdown--voting-upcoming',
    countdownLabel: 'Opens in',
    icon: Vote,
    showVotingTimeline: true,
  },
  'voting-open': {
    eyebrow: 'Executive election',
    title: 'Voting is live',
    targetPrefix: 'Closes',
    modifier: 'election-countdown--voting-open',
    countdownLabel: 'Time remaining to vote',
    icon: Vote,
  },
}

const votingTimelineSteps = [
  { label: 'Applications reviewed', state: 'done' as const },
  { label: 'Voting opens', state: 'active' as const },
  { label: 'Cast your ballot', state: 'upcoming' as const },
]

function VotingTimeline() {
  return (
    <ol
      className="grid gap-2 sm:grid-cols-3 sm:gap-3"
      aria-label="Election progress"
    >
      {votingTimelineSteps.map((step, index) => (
        <li
          key={step.label}
          className={cn(
            'flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-xs sm:flex-col sm:items-start sm:gap-2 sm:px-3.5 sm:py-3 sm:text-sm',
            step.state === 'done' && 'border-success/25 bg-success/5',
            step.state === 'active' && 'border-primary/30 bg-primary/5 shadow-sm',
            step.state === 'upcoming' && 'border-border/80 bg-card/40 opacity-80',
          )}
        >
          <div className="flex items-center gap-2 sm:w-full">
            {step.state === 'done' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            ) : step.state === 'active' ? (
              <span className="relative flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/30" />
                <Circle className="relative h-3 w-3 fill-primary text-primary" />
              </span>
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden="true" />
            )}
            <span
              className={cn(
                'font-medium leading-snug',
                step.state === 'active' && 'text-foreground',
                step.state === 'done' && 'text-foreground',
                step.state === 'upcoming' && 'text-muted-foreground',
              )}
            >
              {step.label}
            </span>
          </div>
          {index < votingTimelineSteps.length - 1 ? (
            <span className="sr-only">, then </span>
          ) : null}
        </li>
      ))}
    </ol>
  )
}

export function ElectionCountdownHero({
  variant,
  electionName,
  targetAt,
  className,
}: ElectionCountdownHeroProps) {
  const copy = variantCopy[variant]
  const Icon = copy.icon

  return (
    <section
      className={cn(
        'election-countdown relative mt-3 w-full min-w-0 overflow-hidden rounded-2xl p-4 sm:mt-4 sm:rounded-3xl sm:p-6 md:p-8',
        copy.modifier,
        className,
      )}
      aria-live="polite"
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full blur-3xl sm:-right-8 sm:-top-8 sm:h-44 sm:w-44"
        style={{ background: 'var(--cd-glow-a)' }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-16 left-1/4 h-40 w-40 rounded-full blur-3xl sm:h-52 sm:w-52"
        style={{ background: 'var(--cd-glow-b)' }}
        aria-hidden="true"
      />

      <div className="relative space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 space-y-2 sm:space-y-3">
            <div
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm transition-colors duration-500 ease-out sm:gap-2 sm:px-3 sm:text-xs"
              style={{
                background: 'var(--cd-chip-bg)',
                borderColor: 'var(--cd-chip-border)',
                color: 'var(--cd-chip-text)',
              }}
            >
              <Icon className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
              <span className="truncate">{copy.eyebrow}</span>
            </div>
            <div className="min-w-0 space-y-1.5 sm:space-y-2">
              <h2
                className="text-xl font-bold tracking-tight sm:text-2xl md:text-3xl"
                style={{ color: 'var(--cd-title)' }}
              >
                {copy.title}
              </h2>
              {copy.description ? (
                <p
                  className="max-w-2xl text-sm leading-relaxed sm:text-base"
                  style={{ color: 'var(--cd-subtitle)' }}
                >
                  {copy.description}
                </p>
              ) : null}
              <p
                className={cn(
                  'text-sm sm:text-base',
                  copy.description
                    ? 'font-medium text-foreground/80'
                    : 'line-clamp-2',
                )}
                style={copy.description ? undefined : { color: 'var(--cd-subtitle)' }}
              >
                {electionName}
              </p>
            </div>
          </div>

          {targetAt ? (
            <div
              className="flex w-full min-w-0 items-center gap-2.5 rounded-xl border px-3.5 py-3 text-xs backdrop-blur-sm transition-colors duration-500 ease-out sm:w-auto sm:min-w-[15rem] sm:max-w-sm sm:self-start sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm"
              style={{
                background: 'var(--cd-date-bg)',
                borderColor: 'var(--cd-date-border)',
                color: 'var(--cd-date-text)',
              }}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{
                  background: 'var(--cd-chip-bg)',
                  color: 'var(--cd-chip-text)',
                }}
              >
                <CalendarClock className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-wide opacity-70 sm:text-xs">
                  {copy.targetPrefix}
                </span>
                <span className="block break-words font-medium leading-snug">
                  {formatDate(targetAt)}
                </span>
              </span>
            </div>
          ) : null}
        </div>

        {copy.showVotingTimeline ? <VotingTimeline /> : null}

        <CountdownDisplay targetAt={targetAt} label={copy.countdownLabel} />
      </div>
    </section>
  )
}
