import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, Radio } from 'lucide-react'
import { fetchLiveStats } from '@/api/dashboard'
import { LazyCandidateVotesDonutChart, LazyPositionTurnoutBarChart } from '@/components/charts/LazyCharts'
import { ChartCard } from '@/components/charts/ChartCard'
import { ChartDataTable } from '@/components/charts/ChartDataTable'
import { pageLayoutClass } from '@/lib/design-tokens'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { LiveUpdateIndicator } from '@/components/shared/LiveUpdateIndicator'
import { QueryErrorState } from '@/components/shared/QueryErrorState'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'

const POLL_INTERVAL_SECONDS = 10

export function LiveStatsPage() {
  const { data, isLoading, isError, isFetching, dataUpdatedAt, refetch } = useQuery({
    queryKey: ['dashboard-live'],
    queryFn: () => fetchLiveStats(),
    refetchInterval: POLL_INTERVAL_SECONDS * 1000,
    refetchIntervalInBackground: false,
  })

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (isError) {
    return (
      <div className={pageLayoutClass}>
        <PageHeader title="Live statistics" description="Real-time vote counts during active elections" />
        <QueryErrorState onRetry={() => void refetch()} isRetrying={isFetching} />
      </div>
    )
  }

  if (!data?.election) {
    return (
      <div className={pageLayoutClass}>
        <PageHeader
          title="Live statistics"
          description={`Real-time vote counts (refreshes every ${POLL_INTERVAL_SECONDS} seconds)`}
        />
        <EmptyState
          icon={Radio}
          title="No active election"
          description="Start an election to monitor live vote counts and candidate rankings."
        >
          <Button asChild variant="outline">
            <Link to="/admin/elections">
              <Plus className="h-4 w-4" />
              Manage elections
            </Link>
          </Button>
        </EmptyState>
      </div>
    )
  }

  const positionChart = data.positions.map((p) => ({
    name: p.position_name,
    votes: p.total_votes,
  }))

  const topCandidates = [...data.candidates]
    .sort((a, b) => b.vote_count - a.vote_count)
    .slice(0, 6)

  const isLive = data.election.status === 'ACTIVE'

  const positionSummary =
    positionChart.length > 0
      ? `Votes per position: ${positionChart.map((p) => `${p.name} ${p.votes}`).join(', ')}`
      : 'No votes recorded yet'

  const candidateSummary =
    topCandidates.length > 0
      ? `Top candidates: ${topCandidates.map((c) => `${c.full_name} ${c.vote_count} votes`).join(', ')}`
      : 'No candidate votes yet'

  return (
    <div className={pageLayoutClass}>
      <PageHeader
        title="Live statistics"
        description={data.election.name}
        action={
          <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
            <LiveUpdateIndicator
              isActive={isLive}
              updatedAt={dataUpdatedAt}
              pollIntervalSeconds={POLL_INTERVAL_SECONDS}
            />
            <Badge variant={isLive ? 'success' : 'secondary'}>{data.election.status}</Badge>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Total votes" value={data.total_votes.toLocaleString()} className="border shadow-sm" />
        <StatCard title="Positions" value={data.positions.length} className="border shadow-sm" />
        <StatCard
          title="Leading candidate"
          value={data.highest_voted_overall?.full_name ?? '—'}
          description={
            data.highest_voted_overall
              ? `${data.highest_voted_overall.vote_count} votes`
              : undefined
          }
          className="border shadow-sm"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Votes per position"
          summary={positionSummary}
          isEmpty={positionChart.length === 0}
          emptyTitle="No votes yet"
          emptyDescription="Votes will appear here as members cast ballots."
          contentClassName="h-72"
        >
          <LazyPositionTurnoutBarChart data={positionChart} />
          <ChartDataTable
            caption="Votes per position"
            columns={['Position', 'Votes']}
            rows={positionChart.map((item) => [item.name, item.votes])}
          />
        </ChartCard>

        <ChartCard
          title="Top candidates"
          summary={candidateSummary}
          isEmpty={topCandidates.length === 0}
          emptyTitle="No candidates"
          emptyDescription="Add candidates to see vote distribution."
          contentClassName="h-72"
        >
          <LazyCandidateVotesDonutChart data={topCandidates} />
          <ChartDataTable
              caption="Top candidates vote distribution"
              columns={['Candidate', 'Votes']}
              rows={topCandidates.map((item) => [item.full_name, item.vote_count])}
            />
          </ChartCard>
      </div>

      {data.positions.length === 0 ? (
        <EmptyState
          title="No rankings yet"
          description="Position rankings will populate once voting begins."
          className="py-8"
        />
      ) : (
        <div className="space-y-4">
          {data.positions.map((position) => (
            <Card key={position.position_id}>
              <CardHeader>
                <CardTitle className="text-base">{position.position_name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {position.rankings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No votes for this position yet.</p>
                ) : (
                  position.rankings.map((rank) => (
                    <div key={rank.candidate_id} className="flex items-center justify-between text-sm">
                      <span>
                        #{rank.rank} {rank.full_name}
                      </span>
                      <span className="font-medium tabular-nums">
                        {rank.vote_count} ({rank.vote_percentage}%)
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
