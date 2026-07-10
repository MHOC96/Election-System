import { CalendarClock, Sparkles } from 'lucide-react'
import { splitCountdown } from '@/lib/datetime'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

export type CountdownVariant =
  | 'applications-upcoming'
  | 'applications-open'
  | 'voting-open'

interface ElectionCountdownHeroProps {
  variant: CountdownVariant
  electionName: string
  targetAt: string | null
  countdownMs: number | null
  className?: string
}

const variantCopy: Record<
  CountdownVariant,
  { eyebrow: string; title: string; targetPrefix: string; modifier: string }
> = {
  'applications-upcoming': {
    eyebrow: 'Candidate applications',
    title: 'Applications opening soon',
    targetPrefix: 'Opens',
    modifier: 'election-countdown--applications-upcoming',
  },
  'applications-open': {
    eyebrow: 'Candidate applications',
    title: 'Applications are live',
    targetPrefix: 'Closes',
    modifier: 'election-countdown--applications-open',
  },
  'voting-open': {
    eyebrow: 'Executive election',
    title: 'Voting is live',
    targetPrefix: 'Closes',
    modifier: 'election-countdown--voting-open',
  },
}

function TimeUnit({
  value,
  label,
  pulse,
}: {
  value: number
  label: string
  pulse?: boolean
}) {
  return (
    <div
      className={cn(
        'election-countdown__digit flex w-full min-w-0 flex-col items-center justify-center rounded-xl px-2 py-2.5 sm:rounded-2xl sm:px-3 sm:py-3.5 md:px-4 md:py-4',
        pulse && 'election-countdown__digit--seconds',
      )}
    >
      <span className="election-countdown__digit-value text-2xl font-bold leading-none tabular-nums tracking-tight sm:text-3xl md:text-4xl">
        {String(value).padStart(2, '0')}
      </span>
      <span
        className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] sm:mt-2 sm:text-xs sm:tracking-[0.2em]"
        style={{ color: 'var(--cd-label)' }}
      >
        {label}
      </span>
    </div>
  )
}

export function ElectionCountdownHero({
  variant,
  electionName,
  targetAt,
  countdownMs,
  className,
}: ElectionCountdownHeroProps) {
  const copy = variantCopy[variant]
  const parts =
    countdownMs !== null ? splitCountdown(countdownMs) : { days: 0, hours: 0, minutes: 0, seconds: 0 }
  const showDays = parts.days > 0

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

        {countdownMs !== null ? (
          <div className="space-y-2.5 sm:space-y-3">
            <p className="text-xs font-medium sm:text-sm" style={{ color: 'var(--cd-subtitle)' }}>
              {variant === 'applications-upcoming'
                ? 'Time until applications open'
                : 'Time remaining'}
            </p>
            <div
              className={cn(
                'grid w-full gap-2 sm:gap-3',
                showDays ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3',
              )}
            >
              {showDays ? <TimeUnit value={parts.days} label="Days" /> : null}
              <TimeUnit value={parts.hours} label="Hours" />
              <TimeUnit value={parts.minutes} label="Minutes" />
              <TimeUnit value={parts.seconds} label="Seconds" pulse />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
