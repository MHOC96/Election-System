import { lazyWithPreload } from '@/lib/lazyWithPreload'
import type { ElectionPhase } from '@/types/api'

export const BallotPage = lazyWithPreload(() =>
  import('@/pages/member/BallotPage').then((m) => ({ default: m.BallotPage })),
)

export const CandidateApplicationPage = lazyWithPreload(() =>
  import('@/pages/member/CandidateApplicationPage').then((m) => ({
    default: m.CandidateApplicationPage,
  })),
)

export const MemberApplicationStatusPage = lazyWithPreload(() =>
  import('@/pages/member/MemberApplicationStatusPage').then((m) => ({
    default: m.MemberApplicationStatusPage,
  })),
)

export const PublishedResultsPage = lazyWithPreload(() =>
  import('@/pages/member/PublishedResultsPage').then((m) => ({
    default: m.PublishedResultsPage,
  })),
)

export function preloadMemberPhasePage(phase: ElectionPhase) {
  switch (phase) {
    case 'SCHEDULED':
    case 'APPLICATIONS_OPEN':
      return CandidateApplicationPage.preload()
    case 'VOTING_OPEN':
      return BallotPage.preload()
    case 'RESULTS_PUBLISHED':
      return PublishedResultsPage.preload()
    case 'REVIEWING':
    case 'READY_FOR_VOTING':
    case 'VOTING_CLOSED':
      return MemberApplicationStatusPage.preload()
    default:
      return Promise.resolve()
  }
}
