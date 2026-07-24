import { ElectionStatusBadge } from '@/components/shared/StatusBadge'
import { memberPhaseLabel, memberPhasePulseClass } from '@/lib/member-phase-ui'
import { cn } from '@/lib/utils'
import type { ElectionPhase } from '@/types/api'

interface MemberPhaseStripProps {
  phase: ElectionPhase | string
  /** Compact pill for desktop header; full-width banner on mobile */
  variant?: 'banner' | 'pill'
  className?: string
}

export function MemberPhaseStrip({ phase, variant = 'banner', className }: MemberPhaseStripProps) {
  const label = memberPhaseLabel(phase)
  const showPulse = memberPhasePulseClass(phase)

  if (variant === 'pill') {
    return (
      <ElectionStatusBadge
        status={phase as ElectionPhase}
        className={cn('max-w-full shrink-0 truncate text-xs normal-case tracking-normal sm:text-sm', className)}
        aria-label={`Election status: ${label}`}
      >
        {label}
      </ElectionStatusBadge>
    )
  }

  return (
    <div
      className={cn(
        'member-surface member-surface--inset flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-center text-xs font-medium leading-snug sm:text-sm',
        className,
      )}
      role="status"
      aria-label={`Election status: ${label}`}
      style={{ color: 'var(--cd-chip-text)' }}
    >
      {showPulse ? (
        <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-50" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
        </span>
      ) : null}
      <span className="text-pretty">{label}</span>
    </div>
  )
}
