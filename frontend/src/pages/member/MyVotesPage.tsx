import { useQuery } from '@tanstack/react-query'
import { ClipboardList } from 'lucide-react'
import { fetchVoteStatus } from '@/api/votes'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDate, formatPercent } from '@/lib/utils'

export function MyVotesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-votes'],
    queryFn: fetchVoteStatus,
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (!data?.election) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No active election"
        description="Your vote history will appear here during an election."
      />
    )
  }

  const progress =
    data.positions_total > 0 ? (data.positions_voted / data.positions_total) * 100 : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">My Votes</h2>
          <p className="text-muted-foreground">Only you can see your selections</p>
        </div>
        <Badge variant={data.ballot_complete ? 'success' : 'warning'}>
          {data.positions_voted}/{data.positions_total} positions
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{data.election.name}</CardTitle>
          <CardDescription>Ballot completion progress</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-2 flex justify-between text-sm">
            <span>{data.positions_voted} voted · {data.positions_remaining} remaining</span>
            <span>{formatPercent(progress)}</span>
          </div>
          <Progress value={progress} />
        </CardContent>
      </Card>

      {data.votes.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No votes yet"
          description="Go to the ballot to cast your votes."
        />
      ) : (
        <div className="space-y-3">
          {data.votes.map((vote) => (
            <Card key={vote.position_id}>
              <CardHeader>
                <CardTitle className="text-base">{vote.position_name}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{vote.candidate_name}</p>
                <p className="mt-1">Voted at {formatDate(vote.voted_at)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
