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

export function memberPhaseAccentClass(phase: ElectionPhase | string): string {
  switch (phase) {
    case 'VOTING_OPEN':
      return 'border-success/30 bg-success/10 text-success'
    case 'APPLICATIONS_OPEN':
      return 'border-warning/35 bg-warning/10 text-warning'
    case 'REVIEWING':
    case 'READY_FOR_VOTING':
      return 'border-primary/25 bg-primary/10 text-primary'
    case 'RESULTS_PUBLISHED':
      return 'border-border/70 bg-muted/40 text-foreground'
    case 'VOTING_CLOSED':
      return 'border-border/70 bg-muted/30 text-muted-foreground'
    case 'SCHEDULED':
      return 'border-border/60 bg-card/70 text-muted-foreground'
    default:
      return 'border-border/60 bg-muted/20 text-muted-foreground'
  }
}

export function memberPhasePulseClass(phase: ElectionPhase | string): boolean {
  return phase === 'VOTING_OPEN' || phase === 'APPLICATIONS_OPEN'
}
