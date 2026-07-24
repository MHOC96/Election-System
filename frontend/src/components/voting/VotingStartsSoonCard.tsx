import { Vote } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { CountdownDisplay } from '@/components/shared/CountdownDisplay'
import { CountdownTimeInline } from '@/components/shared/CountdownTimeCard'
import { VotingScheduleDetails } from '@/components/voting/VotingScheduleDetails'
import { electionCountdownCardClass, portalCountdownInnerClass } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

interface VotingStartsSoonCardProps {
  electionName: string
  targetAt: string | null
  votingEndAt?: string | null
  className?: string
}

/** Compact member card — countdown until voting opens, with schedule shown separately. */
export function VotingStartsSoonCard({
  electionName,
  targetAt,
  votingEndAt,
  className,
}: VotingStartsSoonCardProps) {
  return (
    <Card
      className={cn(
        electionCountdownCardClass,
        'election-countdown--voting-upcoming',
        className,
      )}
      aria-live="polite"
    >
      <CardContent className="relative px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
        <div className={cn(portalCountdownInnerClass, 'flex flex-col items-center gap-4 text-center sm:gap-5')}>
          <div className="space-y-2">
            <div
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm sm:h-14 sm:w-14"
              style={{
                background: 'var(--cd-chip-bg)',
                borderColor: 'var(--cd-chip-border)',
                color: 'var(--cd-chip-text)',
              }}
            >
              <Vote className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" />
            </div>
            <h2
              className="text-lg font-bold tracking-tight sm:text-xl"
              style={{ color: 'var(--cd-title, inherit)' }}
            >
              Voting starts soon
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{electionName}</p>
          </div>

          <CountdownTimeInline
            ariaLabel="Time remaining until voting starts"
            className="w-full pt-1"
          >
            <CountdownDisplay
              targetAt={targetAt}
              label="Time remaining until voting starts"
              centered
            />
          </CountdownTimeInline>

          <VotingScheduleDetails
            votingStartAt={targetAt}
            votingEndAt={votingEndAt}
            className="w-full border-t border-border/50 pt-4"
          />
        </div>
      </CardContent>
    </Card>
  )
}
