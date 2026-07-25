import { CheckCircle2 } from 'lucide-react'
import { PortalIconTile } from '@/components/member/PortalCard'
import { memberInsetPanelClass } from '@/lib/design-tokens'
import { accentScope } from '@/lib/portal-accent'
import { cn, formatDate } from '@/lib/utils'

interface MemberSelectionItemProps {
  positionName: string
  candidateName: string
  votedAt: string
}

/** One recorded vote in the member's ballot summary. */
export function MemberSelectionItem({
  positionName,
  candidateName,
  votedAt,
}: MemberSelectionItemProps) {
  return (
    <article
      className={cn(
        memberInsetPanelClass,
        accentScope('success'),
        'flex items-start gap-3.5 sm:gap-4',
      )}
    >
      <PortalIconTile>
        <CheckCircle2 className="h-5 w-5" />
      </PortalIconTile>
      <div className="min-w-0 flex-1">
        <p className="portal-subtle truncate text-[11px] font-semibold uppercase tracking-[0.12em]">
          {positionName}
        </p>
        <p className="portal-heading mt-1 truncate text-base font-semibold leading-snug sm:text-lg">
          {candidateName}
        </p>
        <time className="portal-subtle mt-1.5 block text-xs" dateTime={votedAt}>
          Submitted {formatDate(votedAt)}
        </time>
      </div>
    </article>
  )
}
