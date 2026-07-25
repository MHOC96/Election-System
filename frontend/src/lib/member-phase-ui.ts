import type { PortalAccent } from '@/lib/portal-accent'
import type { ElectionPhase } from '@/types/api'

export function memberPhaseLabel(phase: ElectionPhase | string): string {
  switch (phase) {
    case 'VOTING_OPEN':
      return 'Voting is open'
    case 'APPLICATIONS_OPEN':
      return 'Applications are open'
    case 'REVIEWING':
      return 'Applications under review'
    case 'READY_FOR_VOTING':
      return 'Voting starts soon'
    case 'RESULTS_PUBLISHED':
      return 'Results published'
    case 'VOTING_CLOSED':
      return 'Voting has ended'
    case 'SCHEDULED':
      return 'Applications open soon'
    default:
      return phase.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())
  }
}

/**
 * Accent scope for a phase. Green means "open, act now", amber means "we are
 * working on it", blue means voting, violet means results, grey means idle.
 * Every phase page wraps itself in this so the whole screen shifts colour
 * together instead of tinting elements one by one.
 */
export function memberPhaseAccent(phase: ElectionPhase | string | undefined): PortalAccent {
  switch (phase) {
    case 'APPLICATIONS_OPEN':
      return 'success'
    case 'REVIEWING':
      return 'warning'
    case 'READY_FOR_VOTING':
    case 'VOTING_OPEN':
      return 'brand'
    case 'RESULTS_PUBLISHED':
      return 'info'
    case 'SCHEDULED':
    case 'VOTING_CLOSED':
    default:
      return 'neutral'
  }
}

/** Phases that are actively accepting member input. */
export function memberPhaseIsLive(phase: ElectionPhase | string): boolean {
  return phase === 'VOTING_OPEN' || phase === 'APPLICATIONS_OPEN'
}
