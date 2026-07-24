import { useQuery } from '@tanstack/react-query'
import { Medal, Trophy } from 'lucide-react'
import { fetchPublishedResults } from '@/api/elections'
import { EmptyState } from '@/components/shared/EmptyState'
import { MemberPageHeader } from '@/components/member/MemberPageHeader'
import { MemberPage } from '@/components/layout/MemberPage'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { sectionDelays, Stagger } from '@/components/motion/Stagger'
import {
  memberCardHeaderTintClass,
  memberCardPaddingClass,
  memberCardSurfaceClass,
  memberHeroSurfaceClass,
  memberInsetPanelClass,
  memberResultsGridClass,
} from '@/lib/design-tokens'
import { optimizeCloudinaryUrl } from '@/lib/cloudinary'
import { PUBLISHED_RESULTS_QUERY_KEY, PUBLISHED_RESULTS_STALE_MS } from '@/lib/query-sync'
import { cn } from '@/lib/utils'

function ResultsHero({ electionName }: { electionName: string }) {
  return (
    <section
      className={cn(
        memberCardSurfaceClass,
        memberHeroSurfaceClass,
        memberCardPaddingClass,
        'text-center',
      )}
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/20 sm:h-16 sm:w-16">
        <Trophy className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden="true" />
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-primary">Official results</p>
      <h2 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">{electionName}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground sm:text-base">
        Published winners and vote counts for each executive position.
      </p>
    </section>
  )
}

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
        <Skeleton className="h-44 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </MemberPage>
    )
  }

  if (!results?.positions.length) {
    return (
      <MemberPage>
        <MemberPageHeader title="Election Results" description="Published winners and vote counts" />
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
        <ResultsHero electionName={results.election.name} />
      </Stagger>

      <div className={memberResultsGridClass}>
        {results.positions.map((position) => {
          const winners = position.winners
          return (
            <Card key={position.position_id} className={memberCardSurfaceClass}>
              <CardHeader className={cn(memberCardHeaderTintClass, memberCardPaddingClass, 'pb-4')}>
                <CardTitle className="text-lg sm:text-xl">{position.position_name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {position.academic_year} · {position.total_votes} vote
                  {position.total_votes === 1 ? '' : 's'} cast
                </p>
              </CardHeader>
              <CardContent className={cn(memberCardPaddingClass, 'space-y-5 pt-0')}>
                {winners && winners.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {winners.map((winner) => (
                      <div
                        key={winner.candidate_id}
                        className={cn(
                          memberInsetPanelClass,
                          'relative flex flex-col gap-3 overflow-hidden sm:flex-row sm:items-center sm:gap-4',
                        )}
                      >
                        <div
                          className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl"
                          aria-hidden="true"
                        />
                        <img
                          src={optimizeCloudinaryUrl(winner.photo_url, 96)}
                          alt=""
                          className="relative h-16 w-16 shrink-0 rounded-2xl border-2 border-background object-cover shadow-md sm:h-20 sm:w-20"
                        />
                        <div className="relative min-w-0 flex-1">
                          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                            <Medal className="h-3.5 w-3.5" aria-hidden="true" />
                            Winner
                          </p>
                          <p className="mt-1 text-lg font-bold leading-snug sm:text-xl">{winner.full_name}</p>
                          <p className="mt-0.5 text-sm text-muted-foreground">
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
                    <p className="text-sm font-semibold">All candidates</p>
                    <ul className="space-y-1.5 text-sm">
                      {position.candidates.map((candidate) => (
                        <li
                          key={candidate.candidate_id}
                          className="flex flex-col gap-1 rounded-xl border border-transparent px-3 py-2.5 transition-colors hover:border-border/60 hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between sm:gap-2"
                        >
                          <span className="min-w-0 break-words font-medium">
                            #{candidate.rank} {candidate.full_name}
                          </span>
                          <span className="shrink-0 tabular-nums text-muted-foreground">
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
