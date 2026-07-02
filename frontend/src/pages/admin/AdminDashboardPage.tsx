import { Link } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { FadeIn } from '@/components/motion/FadeIn'
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion'
import { Activity, Plus, TrendingUp, Trophy, Users, Vote } from 'lucide-react'
import { fetchDashboardSummary, fetchLiveStats } from '@/api/dashboard'
import { LazyParticipationDonutChart } from '@/components/charts/LazyCharts'
import { ChartCard } from '@/components/charts/ChartCard'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'
import { PositionLiveResultCard } from '@/components/dashboard/PositionLiveResultCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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

  const [summaryQuery, liveQuery] = useQueries({
    queries: [
      {
        queryKey: ['dashboard-summary'],
        queryFn: () => fetchDashboardSummary(),
        refetchInterval: POLL_INTERVAL_SECONDS * 1000,
        refetchIntervalInBackground: false,
      },
      {
        queryKey: ['dashboard-live'],
        queryFn: () => fetchLiveStats(),
        refetchInterval: POLL_INTERVAL_SECONDS * 1000,
        refetchIntervalInBackground: false,
      },
    ],
  })

  const isLoading = summaryQuery.isLoading || liveQuery.isLoading
  const isError = summaryQuery.isError || liveQuery.isError
  const isFetching = summaryQuery.isFetching || liveQuery.isFetching
  const dataUpdatedAt = Math.max(summaryQuery.dataUpdatedAt, liveQuery.dataUpdatedAt)

  const refetch = () => {
    void summaryQuery.refetch()
    void liveQuery.refetch()
  }

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (isError || !summaryQuery.data) {
    return (
      <div className={pageLayoutClass}>
        <PageHeader title="Dashboard" description="Election overview and live results" />
        <QueryErrorState onRetry={() => void refetch()} isRetrying={isFetching} />
      </div>
    )
  }

  const data = summaryQuery.data
  const live = liveQuery.data

  if (!data.election) {
    return (
      <div className={pageLayoutClass}>
        <PageHeader title="Dashboard" description="Election overview and live results" />
        <EmptyState
          icon={Vote}
          title="No election configured"
          description="Create an election to start tracking participation and live results."
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

  const participationTotal =
    data.members_completed_ballot + data.members_partial_ballot + data.members_no_votes

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
  const positions = live?.positions ?? []
  const turnoutByPosition = new Map(
    data.position_turnout.map((item) => [item.position_id, item]),
  )

  return (
    <div className={pageLayoutClass}>
      <PageHeader
        title="Dashboard"
        description="Election overview and live results"
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

      <div>
        <div className="mb-4 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-warning" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-semibold">Live results</h2>
            <p className="text-sm text-muted-foreground">
              Position turnout and vote share for leading candidates
            </p>
          </div>
        </div>

        {positions.length === 0 ? (
          <EmptyState
            title="No results yet"
            description="Position results will appear here once voting begins."
            className="py-8"
          />
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {positions.map((position, index) => {
              const leader = position.rankings.find((r) => r.rank === 1) ?? null
              const runnerUp = position.rankings.find((r) => r.rank === 2) ?? null
              const turnout = turnoutByPosition.get(position.position_id)

              const card = (
                <PositionLiveResultCard
                  positionName={position.position_name}
                  totalVotes={position.total_votes}
                  totalMembers={data.total_members}
                  turnoutPercentage={turnout?.turnout_percentage ?? 0}
                  leader={leader}
                  runnerUp={runnerUp}
                />
              )

              if (reduceMotion) {
                return <div key={position.position_id}>{card}</div>
              }

              return (
                <FadeIn key={position.position_id} delay={index * 0.05} duration={0.2} y={12}>
                  {card}
                </FadeIn>
              )
            })}
          </div>
        )}
      </div>

      <ChartCard
        title="Participation breakdown"
        description="Member ballot completion and votes cast per position"
        summary={participationSummary}
        isEmpty={participationTotal === 0}
        emptyTitle="No member data"
        emptyDescription="Import members to track participation."
      >
        <div className="grid gap-6 lg:grid-cols-2">
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
              <Progress
                value={data.full_ballot_completion_percentage}
                aria-label="Full ballot completion progress"
              />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg border bg-muted/30 px-2 py-2">
                <p className="font-semibold tabular-nums">{formatCount(data.members_completed_ballot)}</p>
                <p className="text-muted-foreground">Completed</p>
              </div>
              <div className="rounded-lg border bg-muted/30 px-2 py-2">
                <p className="font-semibold tabular-nums">{formatCount(data.members_partial_ballot)}</p>
                <p className="text-muted-foreground">Partial</p>
              </div>
              <div className="rounded-lg border bg-muted/30 px-2 py-2">
                <p className="font-semibold tabular-nums">{formatCount(data.members_no_votes)}</p>
                <p className="text-muted-foreground">No votes</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold">Votes by position</h3>
              <p className="text-xs text-muted-foreground">
                Members who voted for each executive position
              </p>
            </div>
            {data.position_turnout.length === 0 ? (
              <p className="text-sm text-muted-foreground">No positions configured yet.</p>
            ) : (
              <div className="space-y-3">
                {data.position_turnout.map((item) => (
                  <div key={item.position_id} className="rounded-lg border bg-muted/20 px-3 py-3">
                    <div className="mb-2 flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium">{item.position_name}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {formatCount(item.votes_cast)} / {formatCount(data.total_members)}
                      </span>
                    </div>
                    <Progress
                      value={item.turnout_percentage}
                      aria-label={`${item.position_name} turnout`}
                      className="h-2"
                    />
                    <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
                      <span>{formatPercent(item.turnout_percentage)} voted</span>
                      <span>{formatCount(item.remaining_voters)} remaining</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ChartCard>
    </div>
  )
}
