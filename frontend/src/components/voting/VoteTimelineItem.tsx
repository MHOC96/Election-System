import { CheckCircle2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface VoteTimelineItemProps {
  positionName: string
  candidateName: string
  votedAt: string
  isLast?: boolean
}

export function VoteTimelineItem({
  positionName,
  candidateName,
  votedAt,
  isLast,
}: VoteTimelineItemProps) {
  return (
    <div className="relative flex gap-4 pb-8 last:pb-0">
      {!isLast && (
        <span
          className="absolute left-4 top-8 h-[calc(100%-2rem)] w-px -translate-x-1/2 bg-border"
          aria-hidden="true"
        />
      )}
      <div
        className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-background"
        aria-hidden="true"
      >
        <CheckCircle2 className="h-4 w-4 text-primary" />
      </div>
      <article className="min-w-0 flex-1 rounded-lg border bg-card p-4 shadow-sm">
        <h3 className="text-sm font-medium text-muted-foreground">{positionName}</h3>
        <p className="mt-1 font-semibold">{candidateName}</p>
        <time className="mt-2 block text-xs text-muted-foreground" dateTime={votedAt}>
          Voted {formatDate(votedAt)}
        </time>
      </article>
    </div>
  )
}
