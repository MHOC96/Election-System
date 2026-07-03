import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import { Activity, Plus, TrendingUp, Trophy, Users, Vote } from 'lucide-react'

import { fetchDashboardOverview } from '@/api/dashboard'

import { useDocumentVisible } from '@/lib/useDocumentVisible'

import { LazyParticipationDonutChart } from '@/components/charts/LazyCharts'

import { ChartCard } from '@/components/charts/ChartCard'

import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'

import { PositionLiveResultCard } from '@/components/dashboard/PositionLiveResultCard'

import { sectionDelays, Stagger, StaggerChildren } from '@/components/motion/Stagger'

import { Badge } from '@/components/ui/badge'

import { Button } from '@/components/ui/button'

import { Progress } from '@/components/ui/progress'

import { EmptyState } from '@/components/shared/EmptyState'

import { LiveUpdateIndicator } from '@/components/shared/LiveUpdateIndicator'

import { PageHeader } from '@/components/shared/PageHeader'

import { QueryErrorState } from '@/components/shared/QueryErrorState'

import { StatCard } from '@/components/shared/StatCard'

import { pageLayoutClass } from '@/lib/design-tokens'
import { DASHBOARD_QUERY_KEY } from '@/lib/query-sync'

import { cn, formatPercent } from '@/lib/utils'



const LIVE_POLL_INTERVAL_MS = 10_000

const SUMMARY_POLL_INTERVAL_MS = 15_000



function formatCount(value: number): string {

  return value.toLocaleString()

}



export function AdminDashboardPage() {

  const documentVisible = useDocumentVisible()



  const { data, isLoading, isError, isFetching, dataUpdatedAt, refetch } = useQuery({

    queryKey: DASHBOARD_QUERY_KEY,

    queryFn: () => fetchDashboardOverview(),

    staleTime: 0,

    refetchOnMount: 'always',

    refetchOnWindowFocus: true,

    refetchInterval: (query) => {

      if (!documentVisible) return false

      const status = query.state.data?.summary.election?.status

      return status === 'ACTIVE' ? LIVE_POLL_INTERVAL_MS : SUMMARY_POLL_INTERVAL_MS

    },

    refetchIntervalInBackground: false,

  })



  if (isLoading) {

    return <DashboardSkeleton />

  }



  if (isError || !data?.summary) {

    return (

      <div className={pageLayoutClass}>

        <Stagger delayMs={sectionDelays.header}>

          <PageHeader title="Dashboard" description="Election overview and live results" />

        </Stagger>

        <Stagger delayMs={sectionDelays.primary}>

          <QueryErrorState onRetry={() => void refetch()} isRetrying={isFetching} />

        </Stagger>

      </div>

    )

  }



  const summary = data.summary

  const live = data.live



  if (!summary.election) {

    return (

      <div className={pageLayoutClass}>

        <Stagger delayMs={sectionDelays.header}>

          <PageHeader title="Dashboard" description="Election overview and live results" />

        </Stagger>

        <Stagger delayMs={sectionDelays.primary}>

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

        </Stagger>

      </div>

    )

  }



  const participationTotal =

    summary.members_completed_ballot + summary.members_partial_ballot + summary.members_no_votes



  const participationSummary = `Participation: ${summary.members_completed_ballot} completed, ${summary.members_partial_ballot} partial, ${summary.members_no_votes} with no votes`



  const stats = [

    {

      title: 'Total Members',

      value: formatCount(summary.total_members),

      description: `${formatCount(summary.remaining_voters)} not yet voted`,

      icon: Users,

    },

    {

      title: 'Candidates',

      value: formatCount(summary.total_candidates),

      icon: Activity,

    },

    {

      title: 'Positions',

      value: formatCount(summary.total_positions),

      icon: Vote,

    },

    {

      title: 'Votes Cast',

      value: formatCount(summary.votes_cast),

      description: `${formatPercent(summary.turnout_percentage)} avg turnout`,

      icon: TrendingUp,

    },

  ]



  const isLive = summary.election.status === 'ACTIVE'

  const positions = live?.positions ?? []

  const turnoutByPosition = new Map(

    summary.position_turnout.map((item) => [item.position_id, item]),

  )



  return (

    <div className={pageLayoutClass}>

      <Stagger delayMs={sectionDelays.header}>

        <PageHeader

          title="Dashboard"

          description="Election overview and live results"

          action={

            <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">

              <LiveUpdateIndicator

                isActive={isLive}

                updatedAt={dataUpdatedAt}

                pollIntervalSeconds={LIVE_POLL_INTERVAL_MS / 1000}

              />

              <Badge variant={isLive ? 'success' : 'secondary'}>

                {summary.election.name} — {summary.election.status}

              </Badge>

            </div>

          }

        />

      </Stagger>



      <Stagger delayMs={sectionDelays.primary}>

        <StaggerChildren className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" staggerMs={60}>

          {stats.map((stat) => (

            <StatCard key={stat.title} {...stat} className="border shadow-sm" />

          ))}

        </StaggerChildren>

      </Stagger>



      <Stagger delayMs={sectionDelays.secondary}>

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

            <StaggerChildren className="grid gap-5 lg:grid-cols-2" staggerMs={80} initialDelayMs={40}>

              {positions.map((position) => {

                const leader = position.rankings.find((r) => r.rank === 1) ?? null

                const runnerUp = position.rankings.find((r) => r.rank === 2) ?? null

                const turnout = turnoutByPosition.get(position.position_id)



                return (

                  <PositionLiveResultCard

                    key={position.position_id}

                    positionName={position.position_name}

                    totalVotes={position.total_votes}

                    totalMembers={summary.total_members}

                    turnoutPercentage={turnout?.turnout_percentage ?? 0}

                    leader={leader}

                    runnerUp={runnerUp}

                  />

                )

              })}

            </StaggerChildren>

          )}

        </div>

      </Stagger>



      <Stagger delayMs={sectionDelays.tertiary}>

        <ChartCard

          title="Participation breakdown"

          description="Member ballot completion and votes cast per position"

          summary={participationSummary}

          isEmpty={participationTotal === 0}

          emptyTitle="No member data"

          emptyDescription="Import members to track participation."

        >

          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            <div className="flex flex-col gap-3">
              <div className="relative h-64 w-full overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-muted/20 p-3 ring-1 ring-border/60">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-primary/5 blur-2xl"
                />
                <LazyParticipationDonutChart
                  completed={summary.members_completed_ballot}
                  partial={summary.members_partial_ballot}
                  none={summary.members_no_votes}
                  ariaSummary={participationSummary}
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="flex min-h-[4.25rem] flex-col items-center justify-center rounded-lg border bg-success/5 px-2 py-2.5 text-center ring-1 ring-inset ring-success/15">
                  <p className="text-lg font-semibold tabular-nums leading-none text-success">
                    {formatCount(summary.members_completed_ballot)}
                  </p>
                  <p className="mt-1.5 text-xs text-muted-foreground">Completed</p>
                </div>
                <div className="flex min-h-[4.25rem] flex-col items-center justify-center rounded-lg border bg-warning/5 px-2 py-2.5 text-center ring-1 ring-inset ring-warning/15">
                  <p className="text-lg font-semibold tabular-nums leading-none text-warning">
                    {formatCount(summary.members_partial_ballot)}
                  </p>
                  <p className="mt-1.5 text-xs text-muted-foreground">Partial</p>
                </div>
                <div className="flex min-h-[4.25rem] flex-col items-center justify-center rounded-lg border bg-muted/30 px-2 py-2.5 text-center">
                  <p className="text-lg font-semibold tabular-nums leading-none">
                    {formatCount(summary.members_no_votes)}
                  </p>
                  <p className="mt-1.5 text-xs text-muted-foreground">No votes</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <h3 className="text-sm font-semibold">Votes by position</h3>
                <p className="text-xs text-muted-foreground">
                  Members who voted for each executive position
                </p>
              </div>

              {summary.position_turnout.length === 0 ? (

                <p className="text-sm text-muted-foreground">No positions configured yet.</p>

              ) : (

                <StaggerChildren className="space-y-3" staggerMs={50} initialDelayMs={20}>

                  {summary.position_turnout.map((item) => (

                    <div

                      key={item.position_id}

                      className={cn(

                        'rounded-xl border bg-muted/20 px-3.5 py-3.5 transition-colors',

                        'hover:border-primary/20 hover:bg-muted/30',

                      )}

                    >

                      <div className="mb-2 flex items-center justify-between gap-2 text-sm">

                        <span className="font-medium">{item.position_name}</span>

                        <span className="shrink-0 tabular-nums text-muted-foreground">

                          {formatCount(item.votes_cast)} / {formatCount(summary.total_members)}

                        </span>

                      </div>

                      <Progress

                        value={item.turnout_percentage}

                        aria-label={`${item.position_name} turnout`}

                        className="h-2.5"

                      />

                      <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">

                        <span>{formatPercent(item.turnout_percentage)} voted</span>

                        <span>{formatCount(item.remaining_voters)} remaining</span>

                      </div>

                    </div>

                  ))}

                </StaggerChildren>

              )}

            </div>

          </div>

        </ChartCard>

      </Stagger>

    </div>

  )

}


