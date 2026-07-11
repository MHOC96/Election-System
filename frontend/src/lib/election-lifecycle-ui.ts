import type { Election, ElectionPhase } from '@/types/api'

export interface ElectionNextStep {
  title: string
  detail: string
  href?: string
}

const RAIL_STEPS = [
  { label: 'Draft', phases: ['DRAFT'] as ElectionPhase[] },
  { label: 'Applications', phases: ['SCHEDULED', 'APPLICATIONS_OPEN'] as ElectionPhase[] },
  { label: 'Review', phases: ['REVIEWING'] as ElectionPhase[] },
  { label: 'Voting', phases: ['READY_FOR_VOTING', 'VOTING_OPEN'] as ElectionPhase[] },
  { label: 'Results', phases: ['VOTING_CLOSED', 'RESULTS_PUBLISHED'] as ElectionPhase[] },
  { label: 'Archived', phases: ['ARCHIVED'] as ElectionPhase[] },
] as const

export function getElectionRailStepIndex(phase: ElectionPhase): number {
  const index = RAIL_STEPS.findIndex((step) => step.phases.includes(phase))
  return index === -1 ? 0 : index
}

export { RAIL_STEPS }

export function isFutureDate(iso: string | null | undefined): boolean {
  if (!iso) return false
  const target = new Date(iso).getTime()
  return !Number.isNaN(target) && target > Date.now()
}

export function isVotingStartPending(election: Election): boolean {
  if (election.current_phase !== 'READY_FOR_VOTING' || !election.voting_start_at) return false
  return isFutureDate(election.voting_start_at)
}

export function isApplicationsOpeningSoon(election: Election): boolean {
  if (election.current_phase !== 'SCHEDULED' || !election.application_start_at) return false
  return isFutureDate(election.application_start_at)
}

export function isApplicationsClosingSoon(election: Election): boolean {
  if (election.current_phase !== 'APPLICATIONS_OPEN' || !election.application_end_at) return false
  return isFutureDate(election.application_end_at)
}

export function isVotingClosingSoon(election: Election): boolean {
  if (election.current_phase !== 'VOTING_OPEN' || !election.voting_end_at) return false
  return isFutureDate(election.voting_end_at)
}

export type ElectionCountdownKind =
  | 'applications-upcoming'
  | 'applications-open'
  | 'voting-upcoming'
  | 'voting-open'
  | null

export type ElectionCountdownVariant = Exclude<ElectionCountdownKind, null>

export function getElectionCountdown(
  election: Election,
): { variant: ElectionCountdownVariant; targetAt: string } | null {
  if (isApplicationsOpeningSoon(election) && election.application_start_at) {
    return { variant: 'applications-upcoming', targetAt: election.application_start_at }
  }
  if (isApplicationsClosingSoon(election) && election.application_end_at) {
    return { variant: 'applications-open', targetAt: election.application_end_at }
  }
  if (isVotingStartPending(election) && election.voting_start_at) {
    return { variant: 'voting-upcoming', targetAt: election.voting_start_at }
  }
  if (isVotingClosingSoon(election) && election.voting_end_at) {
    return { variant: 'voting-open', targetAt: election.voting_end_at }
  }
  return null
}

export function electionNeedsPhaseRefresh(election: Election): boolean {
  return getElectionCountdown(election) !== null
}

export function getElectionNextStep(election: Election): ElectionNextStep | null {
  switch (election.current_phase) {
    case 'DRAFT':
      return {
        title: 'Next: Open applications',
        detail: 'Save application start and end dates, then open the election for candidates.',
      }
    case 'SCHEDULED':
      return {
        title: isApplicationsOpeningSoon(election)
          ? 'Applications opening soon'
          : 'Next: Applications window',
        detail: 'Candidates can submit applications once the application period begins.',
      }
    case 'APPLICATIONS_OPEN':
      return {
        title: 'Applications are open',
        detail: 'When the window closes, review and approve candidates before voting.',
      }
    case 'REVIEWING':
      return {
        title: 'Next: Review applications',
        detail: 'Approve or reject pending applications, then schedule voting.',
        href: '/admin/applications',
      }
    case 'READY_FOR_VOTING':
      if (isVotingStartPending(election)) {
        return {
          title: 'Voting starts soon',
          detail: 'Members will be able to cast votes when the scheduled time arrives.',
        }
      }
      if (election.voting_end_at) {
        return {
          title: 'Next: Start voting',
          detail: 'Open the ballot for members when you are ready.',
        }
      }
      return {
        title: 'Next: Schedule voting',
        detail: 'Set voting start and end times, then start voting.',
      }
    case 'VOTING_OPEN':
      return {
        title: 'Voting in progress',
        detail: 'Monitor turnout on the dashboard. Results can be published after voting ends.',
      }
    case 'VOTING_CLOSED':
      return {
        title: 'Next: Publish results',
        detail: 'Release official results to members when you are ready.',
      }
    case 'RESULTS_PUBLISHED':
      return {
        title: 'Next: Archive election',
        detail: 'Archive this election to mark it complete and allow a new one.',
      }
    default:
      return null
  }
}
