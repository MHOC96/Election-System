import { CalendarClock, Sparkles } from 'lucide-react'
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

const variantCopy: Record<
  CountdownVariant,
  { eyebrow: string; title: string; targetPrefix: string; modifier: string; countdownLabel: string }
> = {
  'applications-upcoming': {
    eyebrow: 'Candidate applications',
    title: 'Applications opening soon',
    targetPrefix: 'Opens',
    modifier: 'election-countdown--applications-upcoming',
    countdownLabel: 'Time until applications open',
  },
  'applications-open': {
    eyebrow: 'Candidate applications',
    title: 'Applications are live',
    targetPrefix: 'Closes',
    modifier: 'election-countdown--applications-open',
    countdownLabel: 'Time remaining',
  },
  'voting-upcoming': {
    eyebrow: 'Executive election',
    title: 'Voting opens soon',
    targetPrefix: 'Opens',
    modifier: 'election-countdown--voting-upcoming',
    countdownLabel: 'Time until voting starts',
  },
  'voting-open': {
    eyebrow: 'Executive election',
    title: 'Voting is live',
    targetPrefix: 'Closes',
    modifier: 'election-countdown--voting-open',
    countdownLabel: 'Time remaining',
  },
}

export function ElectionCountdownHero({
  variant,
  electionName,
  targetAt,
  className,
}: ElectionCountdownHeroProps) {
  const copy = variantCopy[variant]

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
              <Sparkles className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
              <span className="truncate">{copy.eyebrow}</span>
            </div>
            <div className="min-w-0">
              <h2
                className="text-xl font-bold tracking-tight sm:text-2xl md:text-3xl"
                style={{ color: 'var(--cd-title)' }}
              >
                {copy.title}
              </h2>
              <p
                className="mt-1 line-clamp-2 text-sm sm:text-base"
                style={{ color: 'var(--cd-subtitle)' }}
              >
                {electionName}
              </p>
            </div>
          </div>

          {targetAt ? (
            <div
              className="flex w-full min-w-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs backdrop-blur-sm transition-colors duration-500 ease-out sm:w-auto sm:max-w-sm sm:self-start sm:rounded-2xl sm:px-4 sm:py-2.5 sm:text-sm md:max-w-md"
              style={{
                background: 'var(--cd-date-bg)',
                borderColor: 'var(--cd-date-border)',
                color: 'var(--cd-date-text)',
              }}
            >
              <CalendarClock className="h-3.5 w-3.5 shrink-0 opacity-80 sm:h-4 sm:w-4" aria-hidden="true" />
              <span className="min-w-0 break-words leading-snug">
                {copy.targetPrefix} {formatDate(targetAt)}
              </span>
            </div>
          ) : null}
        </div>

        <CountdownDisplay targetAt={targetAt} label={copy.countdownLabel} />
      </div>
    </section>
  )
}
