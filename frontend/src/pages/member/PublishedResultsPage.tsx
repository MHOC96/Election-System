import { useQuery } from '@tanstack/react-query'
import { Trophy } from 'lucide-react'
import { fetchPublishedResults } from '@/api/elections'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { MemberPage } from '@/components/layout/MemberPage'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { sectionDelays, Stagger } from '@/components/motion/Stagger'
import {
  insetPanelClass,
  memberCardHeaderTintClass,
  memberCardSurfaceClass,
  memberSectionStackClass,
} from '@/lib/design-tokens'
import { optimizeCloudinaryUrl } from '@/lib/cloudinary'
import { PUBLISHED_RESULTS_QUERY_KEY, PUBLISHED_RESULTS_STALE_MS } from '@/lib/query-sync'
import { cn } from '@/lib/utils'

export function PublishedResultsPage() {
  const { data: results, isLoading } = useQuery({
    queryKey: PUBLISHED_RESULTS_QUERY_KEY,
    queryFn: fetchPublishedResults,
    staleTime: PUBLISHED_RESULTS_STALE_MS,
    refetchOnWindowFocus: false,
  })

  if (isLoading) {
    return (
      <MemberPage>
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-48 w-full" />
      </MemberPage>
    )
  }

  if (!results?.positions.length) {
    return (
      <MemberPage>
        <PageHeader title="Election Results" description="Published winners and vote counts" />
        <EmptyState
          icon={Trophy}
          title="No results published yet"
          description="Results will appear here after the admin publishes them."
        />
      </MemberPage>
    )
  }

  return (
    <MemberPage>
      <Stagger delayMs={sectionDelays.header}>
        <PageHeader
          title={results.election.name}
          description="Official published results"
        />
      </Stagger>

      <div className={memberSectionStackClass}>
        {results.positions.map((position) => {
          const winners = position.winners
          return (
            <Card key={position.position_id} className={memberCardSurfaceClass}>
              <CardHeader className={memberCardHeaderTintClass}>
                <CardTitle>{position.position_name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {position.academic_year} · {position.total_votes} vote
                  {position.total_votes === 1 ? '' : 's'} cast
                </p>
              </CardHeader>
              <CardContent className="space-y-5 pt-5 sm:pt-6">
                {winners && winners.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {winners.map((winner) => (
                      <div
                        key={winner.candidate_id}
                        className={cn(
                          insetPanelClass,
                          'flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4',
                        )}
                      >
                        <img
                          src={optimizeCloudinaryUrl(winner.photo_url, 80)}
                          alt=""
                          className="h-14 w-14 shrink-0 rounded-full object-cover sm:h-16 sm:w-16"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium uppercase tracking-wide text-primary">
                            Winner
                          </p>
                          <p className="text-lg font-semibold">{winner.full_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {winner.vote_count} votes ({winner.vote_percentage}%)
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No votes recorded for this position.</p>
                )}

                {position.candidates.length > 1 ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">All candidates</p>
                    <ul className="space-y-1 text-sm">
                      {position.candidates.map((candidate) => (
                        <li
                          key={candidate.candidate_id}
                          className="flex flex-col gap-1 rounded-lg px-3 py-2 hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between sm:gap-2"
                        >
                          <span className="min-w-0 break-words">
                            #{candidate.rank} {candidate.full_name}
                          </span>
                          <span className="shrink-0 text-sm text-muted-foreground sm:text-base">
                            {candidate.vote_count} ({candidate.vote_percentage}%)
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </MemberPage>
  )
}
