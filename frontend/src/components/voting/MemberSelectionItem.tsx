import { CheckCircle2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface MemberSelectionItemProps {
  positionName: string
  candidateName: string
  votedAt: string
}

export function MemberSelectionItem({
  positionName,
  candidateName,
  votedAt,
}: MemberSelectionItemProps) {
  return (
    <article className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/10 text-success"
        aria-hidden="true"
      >
        <CheckCircle2 className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {positionName}
        </p>
        <p className="mt-0.5 text-base font-semibold leading-snug">{candidateName}</p>
        <time className="mt-1 block text-xs text-muted-foreground" dateTime={votedAt}>
          Submitted {formatDate(votedAt)}
        </time>
      </div>
    </article>
  )
}
