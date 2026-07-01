import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FadeIn } from '@/components/motion/FadeIn'
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion'
import { Activity, CheckCircle2, Plus, TrendingUp, Users, Vote } from 'lucide-react'
import { fetchDashboardSummary } from '@/api/dashboard'
import {
  LazyParticipationDonutChart,
  LazyPositionTurnoutBarChart,
} from '@/components/charts/LazyCharts'
import { ChartDataTable } from '@/components/charts/ChartDataTable'
import { ChartCard } from '@/components/charts/ChartCard'
import { RecentActivityFeed } from '@/components/dashboard/RecentActivityFeed'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { EmptyState } from '@/components/shared/EmptyState'
import { LiveUpdateIndicator } from '@/components/shared/LiveUpdateIndicator'
import { PageHeader } from '@/components/shared/PageHeader'
import { QueryErrorState } from '@/components/shared/QueryErrorState'
import { StatCard } from '@/components/shared/StatCard'
import { pageLayoutClass } from '@/lib/design-tokens'
import { formatPercent } from '@/lib/utils'

const POLL_INTERVAL_SECONDS = 10

function formatCount(value: number): string {
  return value.toLocaleString()
}

export function AdminDashboardPage() {
  const reduceMotion = usePrefersReducedMotion()

  const { data, isLoading, isError, isFetching, dataUpdatedAt, refetch } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => fetchDashboardSummary(),
    refetchInterval: POLL_INTERVAL_SECONDS * 1000,
    refetchIntervalInBackground: false,
  })

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (isError || !data) {
    return (
      <div className={pageLayoutClass}>
        <PageHeader title="Dashboard" description="Election overview and turnout metrics" />
        <QueryErrorState onRetry={() => void refetch()} isRetrying={isFetching} />
      </div>
    )
  }

  if (!data.election) {
    return (
      <div className={pageLayoutClass}>
        <PageHeader title="Dashboard" description="Election overview and turnout metrics" />
        <EmptyState
          icon={Vote}
          title="No election configured"
          description="Create an election to start tracking turnout, participation, and live results."
        >
          <Button asChild>
            <Link to="/admin/elections">
              <Plus className="h-4 w-4" />
              Create election
            </Link>
          </Button>
        </EmptyState>
      </div>
    )
  }

  const turnoutChartData = data.position_turnout.map((item) => ({
    name: item.position_name,
    votes: item.votes_cast,
    percentage: item.turnout_percentage,
  }))

  const participationTotal =
    data.members_completed_ballot + data.members_partial_ballot + data.members_no_votes

  const turnoutSummary =
    turnoutChartData.length > 0
      ? `Turnout by position: ${turnoutChartData.map((d) => `${d.name} ${d.votes} votes`).join(', ')}`
      : 'No position turnout data available'

  const participationSummary = `Participation: ${data.members_completed_ballot} completed, ${data.members_partial_ballot} partial, ${data.members_no_votes} with no votes`

  const stats = [
    {
      title: 'Total Members',
      value: formatCount(data.total_members),
      description: `${formatCount(data.remaining_voters)} not yet voted`,
      icon: Users,
    },
    {
      title: 'Candidates',
      value: formatCount(data.total_candidates),
      icon: Activity,
    },
    {
      title: 'Positions',
      value: formatCount(data.total_positions),
      icon: Vote,
    },
    {
      title: 'Votes Cast',
      value: formatCount(data.votes_cast),
      description: `${formatPercent(data.turnout_percentage)} avg turnout`,
      icon: TrendingUp,
    },
  ]

  const isLive = data.election.status === 'ACTIVE'

  return (
    <div className={pageLayoutClass}>
      <PageHeader
        title="Dashboard"
        description="Election overview and turnout metrics"
        action={
          <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
            <LiveUpdateIndicator
              isActive={isLive}
              updatedAt={dataUpdatedAt}
              pollIntervalSeconds={POLL_INTERVAL_SECONDS}
            />
            <Badge variant={isLive ? 'success' : 'secondary'}>
              {data.election.name} — {data.election.status}
            </Badge>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => {
          const card = <StatCard {...stat} className="border shadow-sm" />
          if (reduceMotion) {
            return <div key={stat.title}>{card}</div>
          }
          return (
            <FadeIn key={stat.title} delay={index * 0.04} duration={0.15} y={8}>
              {card}
            </FadeIn>
          )
        })}
      </div>

      <ChartCard
        title="Position turnout"
        description="Votes cast per executive position"
        summary={turnoutSummary}
        isEmpty={turnoutChartData.length === 0}
        emptyTitle="No positions yet"
        emptyDescription="Add positions and candidates to see turnout comparisons."
        contentClassName="h-80"
      >
        <LazyPositionTurnoutBarChart data={turnoutChartData} />
        <ChartDataTable
          caption="Position turnout data"
          columns={['Position', 'Votes', 'Turnout']}
          rows={turnoutChartData.map((item) => [
            item.name,
            item.votes,
            `${item.percentage?.toFixed(1) ?? 0}%`,
          ])}
        />
      </ChartCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Participation breakdown"
          description="Member ballot completion status"
          summary={participationSummary}
          isEmpty={participationTotal === 0}
          emptyTitle="No member data"
          emptyDescription="Import members to track participation."
        >
          <div className="flex h-80 flex-col">
            <div className="min-h-0 flex-1">
              <LazyParticipationDonutChart
                completed={data.members_completed_ballot}
                partial={data.members_partial_ballot}
                none={data.members_no_votes}
              />
            </div>
            <div className="mt-4 shrink-0 space-y-2 border-t pt-4">
              <div className="flex justify-between text-sm">
                <span>Full ballot completed</span>
                <span className="font-medium tabular-nums">
                  {formatPercent(data.full_ballot_completion_percentage)}
                </span>
              </div>
              <Progress value={data.full_ballot_completion_percentage} aria-label="Full ballot completion progress" />
            </div>
          </div>
          <ChartDataTable
            caption="Participation breakdown data"
            columns={['Status', 'Members']}
            rows={[
              ['Completed ballot', data.members_completed_ballot],
              ['Partial ballot', data.members_partial_ballot],
              ['No votes', data.members_no_votes],
            ]}
          />
        </ChartCard>

        <Card>
          <CardHeader>
            <CardTitle>Position turnout details</CardTitle>
            <CardDescription>Votes per position with progress</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.position_turnout.length === 0 ? (
              <p className="text-sm text-muted-foreground">No position data available.</p>
            ) : (
              data.position_turnout.map((item) => (
                <div key={item.position_id}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{item.position_name}</span>
                    <span className="tabular-nums">
                      {item.votes_cast} / {data.total_members} ({formatPercent(item.turnout_percentage)})
                    </span>
                  </div>
                  <Progress value={item.turnout_percentage} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-4 text-center shadow-sm">
          <CheckCircle2 className="mx-auto mb-2 h-5 w-5 text-success" aria-hidden="true" />
          <p className="text-2xl font-semibold tabular-nums">{formatCount(data.members_completed_ballot)}</p>
          <p className="text-xs text-muted-foreground">Completed ballot</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center shadow-sm">
          <Activity className="mx-auto mb-2 h-5 w-5 text-warning" aria-hidden="true" />
          <p className="text-2xl font-semibold tabular-nums">{formatCount(data.members_partial_ballot)}</p>
          <p className="text-xs text-muted-foreground">Partial ballot</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center shadow-sm">
          <Users className="mx-auto mb-2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <p className="text-2xl font-semibold tabular-nums">{formatCount(data.members_no_votes)}</p>
          <p className="text-xs text-muted-foreground">No votes</p>
        </div>
      </div>

      <RecentActivityFeed />
    </div>
  )
}
