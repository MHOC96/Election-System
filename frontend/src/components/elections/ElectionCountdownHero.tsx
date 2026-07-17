import type { LucideIcon } from 'lucide-react'
import { CalendarClock, Sparkles, Vote } from 'lucide-react'
import { CountdownDisplay } from '@/components/shared/CountdownDisplay'
import { CountdownTimeCard, CountdownTimeInline } from '@/components/shared/CountdownTimeCard'
import { VotingScheduleDetails } from '@/components/voting/VotingScheduleDetails'
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
  votingEndAt?: string | null
  className?: string
  /** Bordered centered card for admin election list items. */
  embedded?: boolean
  /** Centered countdown only — inside a parent card (member portal). */
  inline?: boolean
}

type VariantCopy = {
  eyebrow: string
  title: string
  description?: string
  targetPrefix: string
  modifier: string
  countdownLabel: string
  icon: LucideIcon
  centered?: boolean
  responsiveHorizontal?: boolean
  /** Countdown + close date only — no title, description, or election name. */
  minimal?: boolean
}

const variantCopy: Record<CountdownVariant, VariantCopy> = {
  'applications-upcoming': {
    eyebrow: 'Candidate applications',
    title: 'Applications opening soon',
    description:
      'When the countdown ends, members can submit their candidate application for one position.',
    targetPrefix: 'Opens',
    modifier: 'election-countdown--applications-upcoming',
    countdownLabel: 'Time until applications open',
    icon: Sparkles,
  },
  'applications-open': {
    eyebrow: '',
    title: '',
    targetPrefix: 'Closes',
    modifier: 'election-countdown--applications-open',
    countdownLabel: 'Time remaining to apply',
    icon: Sparkles,
    minimal: true,
  },
  'voting-upcoming': {
    eyebrow: 'Ballot scheduled',
    title: 'Almost time to vote',
    description:
      'Candidates are confirmed. When the countdown ends, return here to choose your representatives.',
    targetPrefix: 'Opens',
    modifier: 'election-countdown--voting-upcoming',
    countdownLabel: 'Time remaining until voting starts',
    icon: Vote,
    centered: true,
    responsiveHorizontal: true,
  },
  'voting-open': {
    eyebrow: 'Executive election',
    title: 'Voting is live',
    targetPrefix: 'Closes',
    modifier: 'election-countdown--voting-open',
    countdownLabel: 'Time remaining to vote',
    icon: Vote,
    centered: true,
  },
}

export function ElectionCountdownHero({
  variant,
  electionName,
  targetAt,
  votingEndAt,
  className,
  embedded = false,
  inline = false,
}: ElectionCountdownHeroProps) {
  const copy = variantCopy[variant]
  const Icon = copy.icon
  const centered = copy.centered === true
  const responsiveHorizontal = copy.responsiveHorizontal === true
  const minimal = copy.minimal === true
  const embeddedMeta =
    variant === 'voting-upcoming'
      ? 'Voting starts soon'
      : variant === 'voting-open'
        ? 'Voting is live'
        : targetAt
          ? `${copy.targetPrefix} · ${formatDate(targetAt)}`
          : undefined

  if (embedded || inline || minimal) {
    const countdown = <CountdownDisplay targetAt={targetAt} label={copy.countdownLabel} centered />

    if (inline) {
      return (
        <CountdownTimeInline ariaLabel={copy.countdownLabel} className={className}>
          {countdown}
        </CountdownTimeInline>
      )
    }

    return (
      <CountdownTimeCard
        modifier={copy.modifier}
        meta={embeddedMeta}
        ariaLabel={copy.countdownLabel || copy.title}
        className={cn('mt-3', className)}
      >
        {countdown}
        {variant === 'voting-upcoming' ? (
          <VotingScheduleDetails
            votingStartAt={targetAt}
            votingEndAt={votingEndAt}
            className="mt-4 border-t border-border/50 pt-4 text-center"
          />
        ) : null}
        {variant === 'voting-open' && targetAt ? (
          <p className="mt-4 border-t border-border/50 pt-4 text-center text-sm text-muted-foreground">
            <span className="font-medium text-foreground/80">Closes</span> · {formatDate(targetAt)}
          </p>
        ) : null}
      </CountdownTimeCard>
    )
  }

  const datePill = targetAt ? (
    <div
      className={cn(
        'inline-flex w-full items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm backdrop-blur-sm sm:px-5',
        responsiveHorizontal ? 'md:w-auto md:min-w-[15rem]' : 'max-w-md sm:w-auto',
        centered && !responsiveHorizontal && 'justify-center',
        centered && responsiveHorizontal && 'justify-center md:justify-start',
      )}
      style={{
        background: 'var(--cd-date-bg)',
        borderColor: 'var(--cd-date-border)',
        color: 'var(--cd-date-text)',
      }}
    >
      <CalendarClock className="h-4 w-4 shrink-0 opacity-80" aria-hidden="true" />
      <span className="min-w-0 text-left">
        <span className="block text-[11px] font-semibold uppercase tracking-wide opacity-70 sm:text-xs">
          {copy.targetPrefix}
        </span>
        <span className="block font-medium leading-snug">{formatDate(targetAt)}</span>
      </span>
    </div>
  ) : null

  const heroSection = (
    <section
      className={cn(
        'election-countdown relative w-full min-w-0 overflow-hidden',
        embedded
          ? 'bg-transparent p-0 shadow-none'
          : 'mt-3 rounded-2xl p-4 sm:mt-4 sm:rounded-3xl sm:p-6 md:p-8',
        copy.modifier,
        centered && 'election-countdown--centered text-center',
        !embedded ? className : undefined,
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

      <div
        className={cn(
          'relative space-y-5 sm:space-y-6',
          centered && !responsiveHorizontal && 'mx-auto flex max-w-2xl flex-col items-center',
          responsiveHorizontal && 'mx-auto w-full max-w-4xl',
        )}
      >
        {responsiveHorizontal ? (
          <>
            <div className="flex flex-col items-center gap-3 text-center md:hidden">
              <div
                className="surface-card flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{
                  background: 'var(--cd-chip-bg)',
                  borderColor: 'var(--cd-chip-border)',
                  color: 'var(--cd-chip-text)',
                }}
              >
                <Icon className="h-7 w-7" aria-hidden="true" />
              </div>
              <div
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold backdrop-blur-sm sm:text-xs"
                style={{
                  background: 'var(--cd-chip-bg)',
                  borderColor: 'var(--cd-chip-border)',
                  color: 'var(--cd-chip-text)',
                }}
              >
                <span>{copy.eyebrow}</span>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--cd-title)' }}>
                  {copy.title}
                </h2>
                {copy.description ? (
                  <p className="mx-auto max-w-lg text-sm leading-relaxed text-balance" style={{ color: 'var(--cd-subtitle)' }}>
                    {copy.description}
                  </p>
                ) : null}
                <p className="text-sm font-medium text-foreground/75">{electionName}</p>
              </div>
              {datePill}
            </div>

            <div className="hidden md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:gap-8">
              <div className="min-w-0 space-y-3">
                <div className="flex items-start gap-4">
                  <div
                    className="surface-card flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
                    style={{
                      background: 'var(--cd-chip-bg)',
                      borderColor: 'var(--cd-chip-border)',
                      color: 'var(--cd-chip-text)',
                    }}
                  >
                    <Icon className="h-7 w-7" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 space-y-2">
                    <div
                      className="inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-sm"
                      style={{
                        background: 'var(--cd-chip-bg)',
                        borderColor: 'var(--cd-chip-border)',
                        color: 'var(--cd-chip-text)',
                      }}
                    >
                      <span>{copy.eyebrow}</span>
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--cd-title)' }}>
                      {copy.title}
                    </h2>
                    {copy.description ? (
                      <p className="max-w-2xl text-base leading-relaxed" style={{ color: 'var(--cd-subtitle)' }}>
                        {copy.description}
                      </p>
                    ) : null}
                    <p className="text-sm font-medium text-foreground/75">{electionName}</p>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-stretch gap-4 md:items-end md:pt-1">
                {datePill}
                <CountdownDisplay targetAt={targetAt} label={copy.countdownLabel} centered={false} />
              </div>
            </div>
          </>
        ) : centered ? (
          <div className="flex flex-col items-center gap-3 sm:gap-4">
            <div
              className="surface-card flex h-14 w-14 items-center justify-center rounded-2xl sm:h-16 sm:w-16"
              style={{
                background: 'var(--cd-chip-bg)',
                borderColor: 'var(--cd-chip-border)',
                color: 'var(--cd-chip-text)',
              }}
            >
              <Icon className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden="true" />
            </div>

            <div
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold backdrop-blur-sm sm:text-xs"
              style={{
                background: 'var(--cd-chip-bg)',
                borderColor: 'var(--cd-chip-border)',
                color: 'var(--cd-chip-text)',
              }}
            >
              <span>{copy.eyebrow}</span>
            </div>

            <div className="space-y-2 sm:space-y-3">
              <h2
                className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl"
                style={{ color: 'var(--cd-title)' }}
              >
                {copy.title}
              </h2>
              {copy.description ? (
                <p
                  className="mx-auto max-w-lg text-sm leading-relaxed text-balance sm:text-base"
                  style={{ color: 'var(--cd-subtitle)' }}
                >
                  {copy.description}
                </p>
              ) : null}
              <p className="text-sm font-medium text-foreground/75 sm:text-base">{electionName}</p>
            </div>

            {datePill}
          </div>
        ) : (
          <div
            className={cn(
              'flex flex-col gap-4 sm:gap-5',
              embedded ? 'text-left' : 'gap-3 sm:gap-4 md:flex-row md:items-start md:justify-between',
            )}
          >
            <div className={cn('min-w-0 space-y-3', !embedded && 'sm:space-y-3 md:text-left')}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-3">
                <div
                  className={cn(
                    'surface-card flex shrink-0 items-center justify-center rounded-2xl',
                    embedded ? 'h-11 w-11' : 'h-12 w-12 sm:h-14 sm:w-14',
                  )}
                  style={{
                    background: 'var(--cd-chip-bg)',
                    borderColor: 'var(--cd-chip-border)',
                    color: 'var(--cd-chip-text)',
                  }}
                >
                  <Icon className={cn(embedded ? 'h-5 w-5' : 'h-6 w-6 sm:h-7 sm:w-7')} aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1 space-y-1.5 sm:space-y-2">
                  <div
                    className="inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm sm:px-3 sm:text-xs"
                    style={{
                      background: 'var(--cd-chip-bg)',
                      borderColor: 'var(--cd-chip-border)',
                      color: 'var(--cd-chip-text)',
                    }}
                  >
                    <span>{copy.eyebrow}</span>
                  </div>
                  <h2
                    className={cn(
                      'font-bold tracking-tight',
                      embedded ? 'text-lg leading-snug' : 'text-xl sm:text-2xl md:text-3xl',
                    )}
                    style={{ color: 'var(--cd-title)' }}
                  >
                    {copy.title}
                  </h2>
                  {copy.description ? (
                    <p
                      className="text-sm leading-relaxed text-muted-foreground"
                      style={{ color: 'var(--cd-subtitle)' }}
                    >
                      {copy.description}
                    </p>
                  ) : null}
                  {!embedded ? (
                    <p
                      className={cn(
                        'text-sm sm:text-base',
                        copy.description ? 'font-medium text-foreground/80' : 'line-clamp-2',
                      )}
                      style={copy.description ? undefined : { color: 'var(--cd-subtitle)' }}
                    >
                      {electionName}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            {targetAt ? (
              <div
                className={cn(
                  'flex w-full min-w-0 items-center gap-2.5 rounded-xl border px-3.5 py-3 text-xs backdrop-blur-sm sm:px-4 sm:text-sm',
                  embedded ? 'sm:max-w-none' : 'sm:w-auto sm:min-w-[15rem] sm:max-w-sm sm:self-start sm:rounded-2xl',
                )}
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
                <span className="min-w-0 flex-1">
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
        )}

        {!responsiveHorizontal ? (
          <div className="mx-auto w-full max-w-2xl">
            <CountdownDisplay
              targetAt={targetAt}
              label={copy.countdownLabel}
              centered={centered}
            />
          </div>
        ) : (
          <div className="mx-auto w-full max-w-2xl md:hidden">
            <CountdownDisplay
              targetAt={targetAt}
              label={copy.countdownLabel}
              centered
            />
          </div>
        )}
      </div>
    </section>
  )

  return (
    <div className={cn('mx-auto w-full max-w-3xl', className)}>
      {heroSection}
    </div>
  )
}
