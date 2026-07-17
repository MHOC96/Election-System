import { formatVotingDuration } from '@/lib/datetime'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface VotingScheduleDetailsProps {
  votingStartAt?: string | null
  votingEndAt?: string | null
  className?: string
}

export function VotingScheduleDetails({
  votingStartAt,
  votingEndAt,
  className,
}: VotingScheduleDetailsProps) {
  const duration =
    votingStartAt && votingEndAt ? formatVotingDuration(votingStartAt, votingEndAt) : null

  if (!votingStartAt && !votingEndAt) return null

  return (
    <div className={cn('space-y-1 text-sm text-muted-foreground', className)}>
      {votingStartAt ? (
        <p>
          <span className="font-medium text-foreground/80">Opens</span> · {formatDate(votingStartAt)}
        </p>
      ) : null}
      {votingEndAt ? (
        <p>
          <span className="font-medium text-foreground/80">Closes</span> · {formatDate(votingEndAt)}
        </p>
      ) : null}
      {duration ? (
        <p>
          <span className="font-medium text-foreground/80">Voting period</span> · {duration}
        </p>
      ) : null}
    </div>
  )
}
