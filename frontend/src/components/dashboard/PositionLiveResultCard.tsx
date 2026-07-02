import { memo } from 'react'
import { Crown, Medal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatPercent } from '@/lib/utils'
import type { CandidateRanking } from '@/types/api'

/** Solid theme colors for live result bars and accents (no gradients). */
const LEADER_COLOR = 'bg-chart-1'
const RUNNER_UP_COLOR = 'bg-chart-4'

interface PositionLiveResultCardProps {
  positionName: string
  totalVotes: number
  totalMembers: number
  turnoutPercentage: number
  leader: CandidateRanking | null
  runnerUp: CandidateRanking | null
  className?: string
}

function shareOfPosition(votes: number, positionTotal: number): number {
  if (positionTotal <= 0) return 0
  return (votes / positionTotal) * 100
}

function VoteShareBar({
  value,
  variant,
}: {
  value: number
  variant: 'leader' | 'runner-up'
}) {
  return (
    <div
      className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          'h-full rounded-full transition-all duration-700 ease-out',
          variant === 'leader' ? LEADER_COLOR : RUNNER_UP_COLOR,
        )}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  )
}

function CandidateRow({
  rank,
  candidate,
  positionTotal,
  variant,
}: {
  rank: 1 | 2
  candidate: CandidateRanking | null
  positionTotal: number
  variant: 'leader' | 'runner-up'
}) {
  const Icon = rank === 1 ? Crown : Medal
  const share = candidate ? shareOfPosition(candidate.vote_count, positionTotal) : 0
  const isLeader = variant === 'leader'

  if (!candidate) {
    return (
      <div className="rounded-xl border border-dashed border-muted-foreground/25 px-4 py-3">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
            <Icon className="h-4 w-4 opacity-40" aria-hidden="true" />
          </span>
          <span>No {rank === 1 ? 'leader' : 'runner-up'} yet</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-xl border px-4 py-3',
        isLeader ? 'border-chart-1/35 bg-chart-1/8' : 'border-chart-4/35 bg-chart-4/8',
      )}
    >
      <div className="mb-2.5 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
              isLeader ? 'bg-chart-1/15 text-chart-1' : 'bg-chart-4/15 text-chart-4',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold leading-tight">{candidate.full_name}</p>
            <p className="text-xs text-muted-foreground">
              {rank === 1 ? 'Leading' : 'Runner-up'} · {formatPercent(share)} of position votes
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-bold tabular-nums leading-none">{candidate.vote_count}</p>
          <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">votes</p>
        </div>
      </div>
      <VoteShareBar value={share} variant={variant} />
    </div>
  )
}

export const PositionLiveResultCard = memo(function PositionLiveResultCard({
  positionName,
  totalVotes,
  totalMembers,
  turnoutPercentage,
  leader,
  runnerUp,
  className,
}: PositionLiveResultCardProps) {
  const leaderShare = leader ? shareOfPosition(leader.vote_count, totalVotes) : 0
  const runnerShare = runnerUp ? shareOfPosition(runnerUp.vote_count, totalVotes) : 0
  const hasVotes = totalVotes > 0

  return (
    <Card
      className={cn(
        'overflow-hidden border shadow-sm transition-shadow hover:shadow-md',
        className,
      )}
    >
      <CardHeader className="space-y-3 border-b bg-muted/30 pb-4">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold leading-tight">{positionName}</CardTitle>
          {hasVotes && (
            <Badge variant="secondary" className="shrink-0 tabular-nums">
              {totalVotes.toLocaleString()} vote{totalVotes === 1 ? '' : 's'}
            </Badge>
          )}
        </div>

        <div className="rounded-xl border bg-card p-3">
          <div className="mb-2 flex items-end justify-between gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Position turnout
              </p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight">
                {totalVotes.toLocaleString()}
                <span className="text-base font-normal text-muted-foreground">
                  {' '}
                  / {totalMembers.toLocaleString()}
                </span>
              </p>
            </div>
            <p className="text-right">
              <span className="text-xl font-bold tabular-nums text-primary">
                {formatPercent(turnoutPercentage)}
              </span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">of members</span>
            </p>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={Math.round(turnoutPercentage)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${positionName} turnout`}
          >
            <div
              className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
              style={{ width: `${Math.min(turnoutPercentage, 100)}%` }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-4">
        {hasVotes ? (
          <>
            {(leader || runnerUp) && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Vote split · {totalVotes.toLocaleString()} total for this position
                </p>
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                  {leader && leaderShare > 0 && (
                    <div
                      className={cn('h-full transition-all duration-700', LEADER_COLOR)}
                      style={{ width: `${leaderShare}%` }}
                      title={`${leader.full_name}: ${formatPercent(leaderShare)}`}
                    />
                  )}
                  {runnerUp && runnerShare > 0 && (
                    <div
                      className={cn('h-full transition-all duration-700', RUNNER_UP_COLOR)}
                      style={{ width: `${runnerShare}%` }}
                      title={`${runnerUp.full_name}: ${formatPercent(runnerShare)}`}
                    />
                  )}
                  {leaderShare + runnerShare < 100 && (
                    <div
                      className="h-full bg-muted-foreground/25"
                      style={{ width: `${100 - leaderShare - runnerShare}%` }}
                      title="Other candidates"
                    />
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                  {leader && (
                    <span className="inline-flex items-center gap-1.5">
                      <span className={cn('h-2 w-2 rounded-full', LEADER_COLOR)} />
                      {leader.full_name} {formatPercent(leaderShare)}
                    </span>
                  )}
                  {runnerUp && (
                    <span className="inline-flex items-center gap-1.5">
                      <span className={cn('h-2 w-2 rounded-full', RUNNER_UP_COLOR)} />
                      {runnerUp.full_name} {formatPercent(runnerShare)}
                    </span>
                  )}
                </div>
              </div>
            )}

            <CandidateRow rank={1} candidate={leader} positionTotal={totalVotes} variant="leader" />
            <CandidateRow rank={2} candidate={runnerUp} positionTotal={totalVotes} variant="runner-up" />
          </>
        ) : (
          <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            No votes for this position yet. Results will appear as members vote.
          </p>
        )}
      </CardContent>
    </Card>
  )
})
