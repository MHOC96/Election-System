import { CheckCircle2 } from 'lucide-react'
import { memberCardSurfaceClass } from '@/lib/design-tokens'
import { cn, formatDate } from '@/lib/utils'

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
    <article className={cn(memberCardSurfaceClass, 'flex items-start gap-4 rounded-xl p-5')}>
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/10 text-success"
        aria-hidden="true"
      >
        <CheckCircle2 className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {positionName}
        </p>
        <p className="mt-0.5 truncate text-base font-semibold leading-snug">{candidateName}</p>
        <time className="mt-1 block text-xs text-muted-foreground" dateTime={votedAt}>
          Submitted {formatDate(votedAt)}
        </time>
      </div>
    </article>
  )
}
