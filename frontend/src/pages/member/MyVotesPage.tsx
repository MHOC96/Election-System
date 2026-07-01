import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, ClipboardList, Vote } from 'lucide-react'
import { fetchVoteStatus } from '@/api/votes'
import { BallotProgressCard } from '@/components/voting/BallotProgressCard'
import { VoteTimelineItem } from '@/components/voting/VoteTimelineItem'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { pageLayoutClass } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

export function MyVotesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-votes'],
    queryFn: fetchVoteStatus,
  })

  if (isLoading) {
    return (
      <div className={cn(pageLayoutClass, 'mx-auto max-w-3xl')}>
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!data?.election) {
    return (
      <div className={cn(pageLayoutClass, 'mx-auto max-w-3xl')}>
        <PageHeader title="My Votes" description="Your private voting record" />
        <EmptyState
          icon={ClipboardList}
          title="No active election"
          description="Your vote history will appear here during an election."
        />
      </div>
    )
  }

  const isActive = data.election.status === 'ACTIVE'

  return (
    <div className={cn(pageLayoutClass, 'mx-auto max-w-3xl')}>
      <PageHeader
        title="My Votes"
        description="Only you can see your selections"
        action={
          <Badge variant={data.ballot_complete ? 'success' : 'warning'}>
            {data.positions_voted}/{data.positions_total} positions
          </Badge>
        }
      />

      <BallotProgressCard
        electionName={data.election.name}
        status={data.election.status}
        votedCount={data.positions_voted}
        total={data.positions_total}
        isActive={isActive}
      />

      {data.votes.length === 0 ? (
        <EmptyState
          icon={Vote}
          title="No votes yet"
          description="Head to the ballot to cast your votes. Each position allows one irreversible selection."
        >
          <Button asChild>
            <Link to="/vote">
              <Vote className="h-4 w-4" />
              Go to ballot
            </Link>
          </Button>
        </EmptyState>
      ) : (
        <section aria-label="Vote history">
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
            <h2 className="text-sm font-medium text-muted-foreground">
              {data.votes.length} vote{data.votes.length === 1 ? '' : 's'} recorded
            </h2>
          </div>
          <div className="rounded-lg border bg-card p-6">
            {data.votes.map((vote, index) => (
              <VoteTimelineItem
                key={vote.position_id}
                positionName={vote.position_name}
                candidateName={vote.candidate_name}
                votedAt={vote.voted_at}
                isLast={index === data.votes.length - 1}
              />
            ))}
          </div>
          {!data.ballot_complete && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" asChild>
                <Link to="/vote">Continue voting</Link>
              </Button>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
