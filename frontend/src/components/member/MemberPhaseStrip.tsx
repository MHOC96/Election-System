import { memberPhaseIsLive, memberPhaseLabel, memberPhaseBadgeVariant } from '@/lib/member-phase-ui'
import { Badge } from '@/components/ui/badge'
import { PortalLiveDot } from '@/components/member/PortalCard'
import { cn } from '@/lib/utils'
import type { ElectionPhase } from '@/types/api'

interface MemberPhaseStripProps {
  phase: ElectionPhase | string
  variant?: 'banner' | 'pill'
  className?: string
}

/** Election phase badge — uses the same Badge variants as admin. */
export function MemberPhaseStrip({ phase, variant = 'banner', className }: MemberPhaseStripProps) {
  const label = memberPhaseLabel(phase)
  const isLive = memberPhaseIsLive(phase)
  const badgeVariant = memberPhaseBadgeVariant(phase)

  return (
    <Badge
      role="status"
      aria-label={`Election status: ${label}`}
      variant={badgeVariant}
      className={cn(
        variant === 'banner' ? 'w-full justify-center py-2 text-center' : 'max-w-full shrink-0',
        className,
      )}
    >
      {isLive ? <PortalLiveDot /> : null}
      <span className={variant === 'pill' ? 'truncate' : 'text-pretty'}>{label}</span>
    </Badge>
  )
}
