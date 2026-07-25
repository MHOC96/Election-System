import { PortalLiveDot } from '@/components/member/PortalCard'
import { memberPhaseIsLive, memberPhaseLabel } from '@/lib/member-phase-ui'
import { cn } from '@/lib/utils'
import type { ElectionPhase } from '@/types/api'

interface MemberPhaseStripProps {
  phase: ElectionPhase | string
  /** Full-width banner on mobile; compact pill for the desktop header. */
  variant?: 'banner' | 'pill'
  className?: string
}

/**
 * Shows the current election stage. Colour comes from the accent scope on the
 * portal shell, so the strip always matches the rest of the screen.
 */
export function MemberPhaseStrip({ phase, variant = 'banner', className }: MemberPhaseStripProps) {
  const label = memberPhaseLabel(phase)
  const isLive = memberPhaseIsLive(phase)

  return (
    <div
      role="status"
      aria-label={`Election status: ${label}`}
      className={cn(
        'portal-accent-soft portal-accent-text portal-accent-border inline-flex items-center justify-center gap-2 border font-semibold',
        variant === 'banner'
          ? 'w-full rounded-xl px-3 py-2 text-center text-xs leading-snug'
          : 'max-w-full shrink-0 rounded-full px-3 py-1.5 text-xs sm:text-[0.8125rem]',
        className,
      )}
    >
      {isLive ? <PortalLiveDot /> : null}
      <span className={variant === 'pill' ? 'truncate' : 'text-pretty'}>{label}</span>
    </div>
  )
}
