import { CheckCircle2 } from 'lucide-react'
import { memberInsetPanelClass } from '@/lib/design-tokens'
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
    <article className={cn(memberInsetPanelClass, 'flex items-start gap-3.5 sm:gap-4')}>
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-success/12 text-success ring-1 ring-inset ring-success/20"
        aria-hidden="true"
      >
        <CheckCircle2 className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {positionName}
        </p>
        <p className="mt-1 truncate text-base font-semibold leading-snug sm:text-lg">{candidateName}</p>
        <time className="mt-1.5 block text-xs text-muted-foreground" dateTime={votedAt}>
          Submitted {formatDate(votedAt)}
        </time>
      </div>
    </article>
  )
}
