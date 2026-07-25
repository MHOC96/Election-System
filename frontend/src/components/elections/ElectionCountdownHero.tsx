import type { LucideIcon } from 'lucide-react'
import { Sparkles, Vote } from 'lucide-react'
import { PortalPhaseHero } from '@/components/member/PortalPhaseHero'
import { CountdownDisplay } from '@/components/shared/CountdownDisplay'
import { CountdownTimeCard, CountdownTimeInline } from '@/components/shared/CountdownTimeCard'
import { VotingScheduleDetails } from '@/components/voting/VotingScheduleDetails'
import { accentScope, type PortalAccent } from '@/lib/portal-accent'
import { cn, formatDate } from '@/lib/utils'

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
  /** Bordered, centered card for admin election list items. */
  embedded?: boolean
  /** Countdown only, inside a parent card (member portal). */
  inline?: boolean
}

interface VariantCopy {
  eyebrow: string
  title: string
  description?: string
  targetPrefix: 'Opens' | 'Closes'
  countdownLabel: string
  icon: LucideIcon
  accent: PortalAccent
  /** Admin card meta line; falls back to the target date. */
  embeddedMeta?: string
}

const variantCopy: Record<CountdownVariant, VariantCopy> = {
  'applications-upcoming': {
    eyebrow: 'Candidate applications',
    title: 'Applications opening soon',
    description:
      'When the countdown ends, members can submit a candidate application for one position.',
    targetPrefix: 'Opens',
    countdownLabel: 'Time until applications open',
    icon: Sparkles,
    accent: 'neutral',
  },
  'applications-open': {
    eyebrow: 'Candidate applications',
    title: 'Applications are open',
    targetPrefix: 'Closes',
    countdownLabel: 'Time remaining to apply',
    icon: Sparkles,
    accent: 'success',
  },
  'voting-upcoming': {
    eyebrow: 'Ballot scheduled',
    title: 'Almost time to vote',
    description:
      'Candidates are confirmed. When the countdown ends, return here to choose your representatives.',
    targetPrefix: 'Opens',
    countdownLabel: 'Time remaining until voting starts',
    icon: Vote,
    accent: 'brand',
    embeddedMeta: 'Voting starts soon',
  },
  'voting-open': {
    eyebrow: 'Executive election',
    title: 'Voting is live',
    targetPrefix: 'Closes',
    countdownLabel: 'Time remaining to vote',
    icon: Vote,
    accent: 'brand',
    embeddedMeta: 'Voting is live',
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

  // Inline: the parent card already supplies the frame, title, and accent.
  if (inline) {
    return (
      <CountdownTimeInline ariaLabel={copy.countdownLabel} className={className}>
        <CountdownDisplay targetAt={targetAt} label={copy.countdownLabel} centered />
      </CountdownTimeInline>
    )
  }

  // Embedded: compact card for the admin election list.
  if (embedded) {
    const meta =
      copy.embeddedMeta ?? (targetAt ? `${copy.targetPrefix} · ${formatDate(targetAt)}` : undefined)

    return (
      <CountdownTimeCard
        meta={meta}
        ariaLabel={copy.countdownLabel}
        className={cn(accentScope(copy.accent), className)}
      >
        <CountdownDisplay targetAt={targetAt} label={copy.countdownLabel} centered />

        {variant === 'voting-upcoming' ? (
          <VotingScheduleDetails
            votingStartAt={targetAt}
            votingEndAt={votingEndAt}
            className="portal-divider mt-4 w-full justify-center border-t pt-4"
          />
        ) : null}

        {variant === 'voting-open' && targetAt ? (
          <p className="portal-divider mt-4 w-full border-t pt-4 text-center text-sm">
            <span className="portal-subtle font-semibold">Closes</span>{' '}
            <span className="portal-body">· {formatDate(targetAt)}</span>
          </p>
        ) : null}
      </CountdownTimeCard>
    )
  }

  return (
    <PortalPhaseHero
      icon={copy.icon}
      eyebrow={copy.eyebrow}
      title={copy.title}
      subtitle={electionName}
      blurb={copy.description}
      meta={targetAt ? `${copy.targetPrefix} · ${formatDate(targetAt)}` : undefined}
      countdownTargetAt={targetAt}
      countdownLabel={copy.countdownLabel}
      className={cn('max-w-3xl', className)}
      footer={
        variant === 'voting-upcoming' ? (
          <VotingScheduleDetails
            votingStartAt={targetAt}
            votingEndAt={votingEndAt}
            className="justify-center"
          />
        ) : undefined
      }
    />
  )
}
