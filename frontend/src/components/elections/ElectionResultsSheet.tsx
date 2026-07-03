import { useQuery } from '@tanstack/react-query'
import { Trophy } from 'lucide-react'
import { fetchDashboardSummary, fetchLiveStats } from '@/api/dashboard'
import { ElectionStatusBadge } from '@/components/shared/StatusBadge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { Election } from '@/types/api'
import { formatDate, formatPercent } from '@/lib/utils'

interface ElectionResultsSheetProps {
  election: Election | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ElectionResultsSheet({ election, open, onOpenChange }: ElectionResultsSheetProps) {
  const electionId = election?.id

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['election-summary', electionId],
    queryFn: () => fetchDashboardSummary(electionId!),
    enabled: open && electionId != null,
  })

  const { data: liveStats, isLoading: liveLoading } = useQuery({
    queryKey: ['election-live-stats', electionId],
    queryFn: () => fetchLiveStats(electionId!),
    enabled: open && electionId != null,
  })

  const isLoading = summaryLoading || liveLoading

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{election?.name ?? 'Election results'}</SheetTitle>
          <SheetDescription>
            {election ? (
              <span className="inline-flex flex-wrap items-center gap-2">
                <ElectionStatusBadge status={election.status} />
                {election.closed_at ? (
                  <span>Closed {formatDate(election.closed_at)}</span>
                ) : null}
              </span>
            ) : (
              'Final results and turnout summary'
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : !summary || !liveStats ? (
            <p className="text-sm text-destructive" role="alert">
              Unable to load election results.
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total votes cast
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold tabular-nums">
                      {liveStats.total_votes.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Avg. position turnout
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold tabular-nums">
                      {formatPercent(summary.turnout_percentage)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Full ballot completed
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold tabular-nums">
                      {summary.members_completed_ballot.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatPercent(summary.full_ballot_completion_percentage)} of members
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Members with no votes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold tabular-nums">
                      {summary.members_no_votes.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {liveStats.highest_voted_overall ? (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Trophy className="h-4 w-4 text-primary" aria-hidden />
                      Overall leading candidate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-semibold">{liveStats.highest_voted_overall.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {liveStats.highest_voted_overall.position_name} ·{' '}
                      {liveStats.highest_voted_overall.vote_count} votes (
                      {liveStats.highest_voted_overall.vote_percentage}%)
                    </p>
                  </CardContent>
                </Card>
              ) : null}

              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Results by position</h3>
                {liveStats.positions.filter((position) => position.rankings.length > 0).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No candidates registered for any position yet.</p>
                ) : (
                  liveStats.positions
                    .filter((position) => position.rankings.length > 0)
                    .map((position) => {
                    const winner = position.highest_voted_candidate
                    const turnout = summary.position_turnout.find(
                      (item) => item.position_id === position.position_id,
                    )

                    return (
                      <Card key={position.position_id}>
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-3">
                            <CardTitle className="text-base">{position.position_name}</CardTitle>
                            {winner ? (
                              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                Winner: {winner.full_name}
                              </span>
                            ) : null}
                          </div>
                          {turnout ? (
                            <div className="space-y-1 pt-2">
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Turnout</span>
                                <span>{formatPercent(turnout.turnout_percentage)}</span>
                              </div>
                              <Progress value={turnout.turnout_percentage} aria-hidden />
                            </div>
                          ) : null}
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {position.rankings.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No votes for this position.</p>
                          ) : (
                            position.rankings.map((rank) => (
                              <div
                                key={rank.candidate_id}
                                className="flex items-center justify-between text-sm"
                              >
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
                    )
                  })
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
