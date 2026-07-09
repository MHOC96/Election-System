import { memo } from 'react'
import { Crown, Medal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatPercent } from '@/lib/utils'
import type { CandidateRanking } from '@/types/api'

const COLORS = [
  'bg-chart-1',
  'bg-chart-2',
  'bg-chart-3',
  'bg-chart-4',
]

const TEXT_COLORS = [
  'text-chart-1',
  'text-chart-2',
  'text-chart-3',
  'text-chart-4',
]

const BORDER_COLORS = [
  'border-chart-1/35 bg-chart-1/10',
  'border-chart-2/35 bg-chart-2/10',
  'border-chart-3/35 bg-chart-3/10',
  'border-chart-4/35 bg-chart-4/10',
]

const ICON_BG_COLORS = [
  'bg-chart-1/20',
  'bg-chart-2/20',
  'bg-chart-3/20',
  'bg-chart-4/20',
]

interface PositionLiveResultCardProps {
  positionName: string
  totalVotes: number
  totalMembers: number
  turnoutPercentage: number
  topCandidates: CandidateRanking[]
  className?: string
}

function shareOfPosition(votes: number, positionTotal: number): number {
  if (positionTotal <= 0) return 0
  return (votes / positionTotal) * 100
}

function VoteShareBar({
  value,
  rank,
}: {
  value: number
  rank: number
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
          COLORS[rank - 1] || 'bg-muted-foreground',
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
}: {
  rank: number
  candidate: CandidateRanking | null
  positionTotal: number
}) {
  const Icon = rank === 1 ? Crown : Medal
  const share = candidate ? shareOfPosition(candidate.vote_count, positionTotal) : 0

  if (!candidate) {
    return (
      <div className="rounded-xl border border-dashed border-muted-foreground/25 px-4 py-3">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
            <Icon className="h-4 w-4 opacity-40" aria-hidden="true" />
          </span>
          <span>No {rank === 1 ? 'leader' : rank === 2 ? 'runner-up' : `candidate ${rank}`} yet</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-xl border px-4 py-3',
        BORDER_COLORS[rank - 1] || 'border-muted bg-muted/8',
      )}
    >
      <div className="mb-2.5 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
              ICON_BG_COLORS[rank - 1] || 'bg-muted',
              TEXT_COLORS[rank - 1] || 'text-muted-foreground',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold leading-tight">{candidate.full_name}</p>
            <p className="text-xs text-muted-foreground">
              {rank === 1 ? 'Leading' : rank === 2 ? 'Runner-up' : `Rank ${rank}`} · {formatPercent(share)} of position votes
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-bold tabular-nums leading-none">{candidate.vote_count}</p>
          <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">votes</p>
        </div>
      </div>
      <VoteShareBar value={share} rank={rank} />
    </div>
  )
}

export const PositionLiveResultCard = memo(function PositionLiveResultCard({
  positionName,
  totalVotes,
  totalMembers,
  turnoutPercentage,
  topCandidates,
  className,
}: PositionLiveResultCardProps) {
  const hasVotes = totalVotes > 0
  const top4 = topCandidates.slice(0, 4)
  const topShares = top4.map(c => shareOfPosition(c.vote_count, totalVotes))
  const totalTopShare = topShares.reduce((sum, share) => sum + share, 0)

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
            {top4.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Vote split · {totalVotes.toLocaleString()} total for this position
                </p>
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                  {top4.map((candidate, idx) => {
                    const share = topShares[idx]
                    if (share <= 0) return null
                    return (
                      <div
                        key={candidate.candidate_id}
                        className={cn('h-full transition-all duration-700', COLORS[idx] || 'bg-muted-foreground')}
                        style={{ width: `${share}%` }}
                        title={`${candidate.full_name}: ${formatPercent(share)}`}
                      />
                    )
                  })}
                  {totalTopShare < 100 && (
                    <div
                      className="h-full bg-muted-foreground/25"
                      style={{ width: `${100 - totalTopShare}%` }}
                      title="Other candidates"
                    />
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                  {top4.map((candidate, idx) => (
                    <span key={candidate.candidate_id} className="inline-flex items-center gap-1.5">
                      <span className={cn('h-2 w-2 rounded-full', COLORS[idx] || 'bg-muted-foreground')} />
                      {candidate.full_name} {formatPercent(topShares[idx])}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {[0, 1, 2, 3].map((idx) => {
                const candidate = top4[idx] || null
                // If there are less than 4 candidates and no votes, maybe don't show all 4 slots, 
                // but since the component used to show leader and runnerup empty, let's show at least up to the number of candidates 
                // if there are fewer than 4 candidates overall? 
                // Actually the requirement is top 4, if there are only 2 candidates we only show 2 rows.
                if (!candidate) return null
                return (
                  <CandidateRow key={candidate.candidate_id} rank={idx + 1} candidate={candidate} positionTotal={totalVotes} />
                )
              })}
            </div>
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
