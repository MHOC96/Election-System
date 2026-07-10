import { useQuery } from '@tanstack/react-query'
import { Clock } from 'lucide-react'
import { fetchOngoingElection } from '@/api/elections'
import { BallotPage } from '@/pages/member/BallotPage'
import { CandidateApplicationPage } from '@/pages/member/CandidateApplicationPage'
import { MemberApplicationStatusPage } from '@/pages/member/MemberApplicationStatusPage'
import { PublishedResultsPage } from '@/pages/member/PublishedResultsPage'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { pageLayoutClass } from '@/lib/design-tokens'
import type { Election } from '@/types/api'

function MemberHomeWaiting({ election }: { election: Election | null | undefined }) {
  return (
    <div className={pageLayoutClass}>
      <PageHeader
        title={election?.name ?? 'Executive Election'}
        description="Member portal"
      />
      <EmptyState
        icon={Clock}
        title={election ? 'Nothing to do right now' : 'No active election'}
        description="Check back when the next election phase begins."
      />
    </div>
  )
}

export function MemberHomePage() {
  const { data: ongoingElection, isLoading } = useQuery({
    queryKey: ['elections', 'ongoing'],
    queryFn: fetchOngoingElection,
    refetchInterval: 15_000,
  })

  if (isLoading) {
    return (
      <div className={pageLayoutClass}>
        <Skeleton className="h-44 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const phase = ongoingElection?.current_phase

  if (phase === 'SCHEDULED' || phase === 'APPLICATIONS_OPEN') {
    return <CandidateApplicationPage />
  }

  if (phase === 'VOTING_OPEN') {
    return <BallotPage />
  }

  if (phase === 'RESULTS_PUBLISHED') {
    return <PublishedResultsPage />
  }

  if (phase === 'REVIEWING' || phase === 'READY_FOR_VOTING' || phase === 'VOTING_CLOSED') {
    return <MemberApplicationStatusPage />
  }

  return <MemberHomeWaiting election={ongoingElection} />
}
