import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import { Activity, Plus, TrendingUp, Trophy, Users, Vote } from 'lucide-react'

import { fetchDashboardOverview } from '@/api/dashboard'

import { useDocumentVisible } from '@/lib/useDocumentVisible'
import { shouldOwnPoll } from '@/lib/tab-coordinator'

import { LazyParticipationDonutChart } from '@/components/charts/LazyCharts'

import { ChartCard } from '@/components/charts/ChartCard'

import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'

import { KpiTile } from '@/components/dashboard/KpiTile'

import { PositionLiveResultCard } from '@/components/dashboard/PositionLiveResultCard'

import { Stagger, StaggerChildren } from '@/components/motion/Stagger'

import { Badge } from '@/components/ui/badge'

import { Button } from '@/components/ui/button'

import { Progress } from '@/components/ui/progress'

import { SegmentedControl } from '@/components/ui/segmented-control'

import { EmptyState } from '@/components/shared/EmptyState'

import { LiveUpdateIndicator } from '@/components/shared/LiveUpdateIndicator'

import { PageHeader } from '@/components/shared/PageHeader'

import { QueryErrorState } from '@/components/shared/QueryErrorState'

import { pageLayoutClass, sectionDescriptionClass, sectionHeadingClass, adminKpiGridClass, contentGridClass, pageHeaderBlockClass, insetPanelClass } from '@/lib/design-tokens'
import {
  DASHBOARD_DEFAULT_ACADEMIC_YEAR,
  DASHBOARD_POLL_MS,
  DASHBOARD_STALE_MS,
  DASHBOARD_SUMMARY_POLL_MS,
  dashboardOverviewQueryKey,
} from '@/lib/query-sync'

import { cn, formatPercent } from '@/lib/utils'

const LIVE_POLL_INTERVAL_MS = DASHBOARD_POLL_MS
const SUMMARY_POLL_INTERVAL_MS = DASHBOARD_SUMMARY_POLL_MS

const ACADEMIC_YEAR_OPTIONS = [
  { value: '2nd Year', label: '2nd Year' },
  { value: '3rd Year', label: '3rd Year' },
] as const

/** Faster section delays — dashboard data is prefetched; avoid stacking animation wait. */
const dashboardDelays = {
  header: 0,
  primary: 0,
  secondary: 40,
  tertiary: 80,
} as const

function formatCount(value: number): string {
  return value.toLocaleString()
}

export function AdminDashboardPage() {
  const queryClient = useQueryClient()
  const documentVisible = useDocumentVisible()

  const [activeTab, setActiveTab] = useState<string>(DASHBOARD_DEFAULT_ACADEMIC_YEAR)

  const { data, isPending, isError, isFetching, dataUpdatedAt, refetch } = useQuery({
    queryKey: dashboardOverviewQueryKey(activeTab),

    queryFn: async () => {
      const key = dashboardOverviewQueryKey(activeTab)
      const interval =
        queryClient.getQueryData<Awaited<ReturnType<typeof fetchDashboardOverview>>>(key)?.summary
          .election?.current_phase === 'VOTING_OPEN'
          ? LIVE_POLL_INTERVAL_MS
          : SUMMARY_POLL_INTERVAL_MS
      if (!shouldOwnPoll(key, interval - 1_000)) {
        const cached = queryClient.getQueryData<Awaited<ReturnType<typeof fetchDashboardOverview>>>(key)
        if (cached !== undefined) return cached
      }
      return fetchDashboardOverview(undefined, activeTab)
    },

    staleTime: DASHBOARD_STALE_MS,
    placeholderData: (previous) => previous,
    refetchOnWindowFocus: false,
    refetchInterval: (query) => {
      if (!documentVisible) return false
      const phase = query.state.data?.summary.election?.current_phase
      return phase === 'VOTING_OPEN' ? LIVE_POLL_INTERVAL_MS : SUMMARY_POLL_INTERVAL_MS
    },
    refetchIntervalInBackground: false,
  })

  if (isPending && !data) {
    return <DashboardSkeleton />
  }

  if (isError || !data?.summary) {
    return (
      <div className={pageLayoutClass}>
        <Stagger delayMs={dashboardDelays.header}>
          <PageHeader title="Dashboard" description="Election overview and live results" />
        </Stagger>
        <Stagger delayMs={dashboardDelays.primary}>
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
        <Stagger delayMs={dashboardDelays.header}>
          <PageHeader title="Dashboard" description="Election overview and live results" />
        </Stagger>
        <Stagger delayMs={dashboardDelays.primary}>
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

  const positionTurnout = summary.position_turnout
  const turnoutSparkline = positionTurnout.map((item) => item.turnout_percentage)
  const voteVolumeSparkline = positionTurnout.map((item) => item.votes_cast)
  const membersParticipating = summary.members_completed_ballot + summary.members_partial_ballot
  const memberParticipationRate =
    summary.total_members > 0
      ? (membersParticipating / summary.total_members) * 100
      : 0
  const positionsWithVotes = positionTurnout.filter((item) => item.votes_cast > 0).length
  const avgCandidatesPerPosition =
    summary.total_positions > 0
      ? (summary.total_candidates / summary.total_positions).toFixed(1)
      : '0'

  const isLive = summary.election.current_phase === 'VOTING_OPEN'
  const positions = (live?.positions ?? []).filter((position) => position.rankings.length > 0)
  const turnoutByPosition = new Map(positionTurnout.map((item) => [item.position_id, item]))
  const phaseBadgeLabel = summary.election.current_phase.replace(/_/g, ' ')

  return (
    <div className={pageLayoutClass}>

      <Stagger delayMs={dashboardDelays.header}>
        <div className={pageHeaderBlockClass}>
          <PageHeader
            title="Dashboard"
            description="Election overview and live results"
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <SegmentedControl
              value={activeTab}
              onValueChange={setActiveTab}
              options={ACADEMIC_YEAR_OPTIONS}
              aria-label="Academic year batch"
              className="sm:shrink-0"
            />

            <div className="flex flex-wrap items-center gap-2">
              <LiveUpdateIndicator
                isActive={isLive}
                updatedAt={dataUpdatedAt}
                pollIntervalSeconds={(isLive ? LIVE_POLL_INTERVAL_MS : SUMMARY_POLL_INTERVAL_MS) / 1000}
              />
              <Badge
                variant={isLive ? 'success' : 'secondary'}
                className="inline-flex max-w-[min(100%,20rem)] items-center gap-1 sm:max-w-none"
                title={`${summary.election.name} — ${phaseBadgeLabel}`}
              >
                <span className="truncate">{summary.election.name}</span>
                <span className="shrink-0 opacity-60">—</span>
                <span className="shrink-0">{phaseBadgeLabel}</span>
              </Badge>
            </div>
          </div>
        </div>
      </Stagger>

      <Stagger delayMs={dashboardDelays.primary}>
        <StaggerChildren className={adminKpiGridClass} staggerMs={30}>
          <KpiTile
            label="Total members"
            value={formatCount(summary.total_members)}
            meta={`${formatCount(summary.remaining_voters)} not yet voted`}
            metaTone="warning"
            progress={memberParticipationRate}
            progressLabel={`${formatPercent(memberParticipationRate)} have cast at least one vote`}
            sparklineData={turnoutSparkline}
            sparklineLabel="Turnout trend by position"
            icon={Users}
            tone="primary"
            className="h-full"
          />
          <KpiTile
            label="Candidates"
            value={formatCount(summary.total_candidates)}
            meta={`${avgCandidatesPerPosition} avg per position`}
            sparklineData={voteVolumeSparkline}
            sparklineLabel="Vote volume by position"
            icon={Activity}
            tone="neutral"
            className="h-full"
          />
          <KpiTile
            label="Positions"
            value={formatCount(summary.total_positions)}
            meta={`${formatCount(positionsWithVotes)} receiving votes`}
            metaTone="success"
            progress={
              summary.total_positions > 0
                ? (positionsWithVotes / summary.total_positions) * 100
                : 0
            }
            progressLabel={`${formatCount(positionsWithVotes)} of ${formatCount(summary.total_positions)} active`}
            sparklineData={turnoutSparkline}
            sparklineLabel="Position turnout distribution"
            icon={Vote}
            tone="neutral"
            className="h-full"
          />
          <KpiTile
            label="Votes cast"
            value={formatCount(summary.votes_cast)}
            meta={`${formatCount(summary.remaining_voters)} voters remaining`}
            progress={summary.turnout_percentage}
            progressLabel={`${formatPercent(summary.turnout_percentage)} average turnout`}
            sparklineData={voteVolumeSparkline}
            sparklineLabel="Votes recorded by position"
            icon={TrendingUp}
            tone="success"
            className="h-full"
          />
        </StaggerChildren>
      </Stagger>

      <Stagger delayMs={dashboardDelays.secondary}>
        <div>
          <div className="mb-4 flex items-center gap-2.5">
            <Trophy className="h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
            <div>
              <h2 className={sectionHeadingClass}>Live results</h2>
              <p className={sectionDescriptionClass}>
                Position turnout and vote share for leading candidates
              </p>
            </div>
          </div>

          {positions.length === 0 ? (
            <EmptyState
              title="No candidates yet"
              description="Live results will appear once candidates are registered for positions."
              className="py-8"
            />
          ) : (
            <StaggerChildren className={contentGridClass} staggerMs={40} initialDelayMs={0}>
              {positions.map((position) => {
                const turnout = turnoutByPosition.get(position.position_id)
                return (
                  <PositionLiveResultCard
                    key={position.position_id}
                    positionName={position.position_name}
                    totalVotes={position.total_votes}
                    totalMembers={summary.total_members}
                    turnoutPercentage={turnout?.turnout_percentage ?? 0}
                    topCandidates={position.rankings}
                  />
                )
              })}
            </StaggerChildren>
          )}
        </div>
      </Stagger>

      {/* ── Participation breakdown ── */}
      <Stagger delayMs={dashboardDelays.tertiary}>
        <ChartCard
          title="Participation breakdown"
          description="Member ballot completion and votes cast per position"
          summary={participationSummary}
          isEmpty={participationTotal === 0}
          emptyTitle="No member data"
          emptyDescription="Import members to track participation."
        >
          <div className="grid gap-8 lg:grid-cols-2 lg:items-stretch">

            <div className="flex flex-col gap-4">
              <div className="relative h-60 w-full overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-muted/25 p-3 ring-1 ring-border/70 shadow-[inset_0_1px_0_var(--portal-surface-inset)] dark:border-border/70 dark:from-card dark:via-card dark:to-muted/15 dark:ring-border/80 dark:shadow-none sm:h-64">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-primary/8 blur-2xl dark:bg-primary/15"
                />
                <LazyParticipationDonutChart
                  completed={summary.members_completed_ballot}
                  partial={summary.members_partial_ballot}
                  none={summary.members_no_votes}
                  ariaSummary={participationSummary}
                />
              </div>

              <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-3 sm:gap-2">
                <div className="flex flex-col items-center justify-center gap-1 rounded-xl border bg-success/8 py-3 text-center ring-1 ring-inset ring-success/20 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.5)] dark:bg-success/10 dark:ring-success/25 dark:shadow-none">
                  <p className="text-lg font-bold tabular-nums leading-none text-success sm:text-xl">
                    {formatCount(summary.members_completed_ballot)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Completed</p>
                </div>
                <div className="flex flex-col items-center justify-center gap-1 rounded-xl border bg-warning/8 py-3 text-center ring-1 ring-inset ring-warning/20 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.5)] dark:bg-warning/10 dark:ring-warning/25 dark:shadow-none">
                  <p className="text-lg font-bold tabular-nums leading-none text-warning sm:text-xl">
                    {formatCount(summary.members_partial_ballot)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Partial</p>
                </div>
                <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-border/70 bg-muted/35 py-3 text-center ring-1 ring-inset ring-border/50 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.5)] dark:border-border/70 dark:bg-muted/25 dark:shadow-none">
                  <p className="text-lg font-bold tabular-nums leading-none sm:text-xl">
                    {formatCount(summary.members_no_votes)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">No votes</p>
                </div>
              </div>
            </div>

            <div className={cn(insetPanelClass, 'flex min-h-[16rem] flex-col gap-4 lg:min-h-[20rem]')}>
              <div>
                <h3 className="text-sm font-semibold">Votes by position</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Members who voted for each executive position
                </p>
              </div>

              {positionTurnout.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center dark:border-border/60 dark:bg-muted/15">
                  <Vote className="mb-3 h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
                  <p className="text-sm font-medium text-foreground">No positions configured yet</p>
                  <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                    Add executive positions to see turnout breakdown by role.
                  </p>
                </div>
              ) : (
                <StaggerChildren className="space-y-2.5" staggerMs={30} initialDelayMs={0}>
                  {positionTurnout.map((item) => (
                    <div
                      key={item.position_id}
                      className={cn(
                        'rounded-xl border border-border/70 bg-muted/25 px-3.5 py-3 transition-colors',
                        'hover:border-primary/25 hover:bg-muted/35',
                        'dark:border-border/70 dark:bg-muted/15 dark:hover:border-primary/30 dark:hover:bg-muted/25',
                      )}
                    >
                      <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                        <span className="min-w-0 truncate font-medium">{item.position_name}</span>
                        <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                          {formatCount(item.votes_cast)}/{formatCount(summary.total_members)}
                        </span>
                      </div>
                      <Progress
                        value={item.turnout_percentage}
                        aria-label={`${item.position_name} turnout`}
                        className="h-2"
                      />
                      <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
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
