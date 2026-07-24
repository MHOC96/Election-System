import { Suspense, useEffect } from 'react'
import { Clock } from 'lucide-react'
import { useOngoingElection } from '@/hooks/useOngoingElection'
import {
  BallotPage,
  CandidateApplicationPage,
  MemberApplicationStatusPage,
  preloadMemberPhasePage,
  PublishedResultsPage,
} from '@/routes/memberPages'
import { EmptyState } from '@/components/shared/EmptyState'
import { QueryErrorState } from '@/components/shared/QueryErrorState'
import { Skeleton } from '@/components/ui/skeleton'
import { MemberPage } from '@/components/layout/MemberPage'
import { memberEmptyStateClass } from '@/lib/design-tokens'
import type { Election } from '@/types/api'

function PhasePageSkeleton() {
  return (
    <MemberPage>
      <Skeleton className="h-12 w-56 rounded-2xl" />
      <Skeleton className="h-44 w-full rounded-3xl" />
      <Skeleton className="h-64 w-full rounded-3xl" />
    </MemberPage>
  )
}

function MemberHomeWaiting({ election }: { election: Election | null | undefined }) {
  return (
    <MemberPage>
      <EmptyState
        icon={Clock}
        title={election ? 'Nothing to do right now' : 'No active election'}
        description="Check back when the next election phase begins."
        className={memberEmptyStateClass}
      />
    </MemberPage>
  )
}

export function MemberHomePage() {
  const { data: ongoingElection, isLoading, isError, isFetching, refetch } = useOngoingElection()
  const phase = ongoingElection?.current_phase

  useEffect(() => {
    if (phase) {
      void preloadMemberPhasePage(phase)
    }
  }, [phase])

  if (isLoading) {
    return <PhasePageSkeleton />
  }

  if (isError) {
    return (
      <MemberPage>
        <QueryErrorState onRetry={() => void refetch()} isRetrying={isFetching} />
      </MemberPage>
    )
  }

  if (phase === 'SCHEDULED' || phase === 'APPLICATIONS_OPEN') {
    return (
      <Suspense fallback={<PhasePageSkeleton />}>
        <CandidateApplicationPage />
      </Suspense>
    )
  }

  if (phase === 'VOTING_OPEN') {
    return (
      <Suspense fallback={<PhasePageSkeleton />}>
        <BallotPage />
      </Suspense>
    )
  }

  if (phase === 'RESULTS_PUBLISHED') {
    return (
      <Suspense fallback={<PhasePageSkeleton />}>
        <PublishedResultsPage />
      </Suspense>
    )
  }

  if (phase === 'REVIEWING' || phase === 'READY_FOR_VOTING' || phase === 'VOTING_CLOSED') {
    return (
      <Suspense fallback={<PhasePageSkeleton />}>
        <MemberApplicationStatusPage />
      </Suspense>
    )
  }

  return <MemberHomeWaiting election={ongoingElection} />
}
