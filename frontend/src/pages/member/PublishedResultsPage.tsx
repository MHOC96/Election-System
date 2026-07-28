import { useQuery } from '@tanstack/react-query'
import { Medal, Trophy } from 'lucide-react'
import { fetchPublishedResults } from '@/api/elections'
import { QueryErrorState } from '@/components/shared/QueryErrorState'
import { EmptyState } from '@/components/shared/EmptyState'
import { MemberPageHeader } from '@/components/member/MemberPageHeader'
import { MemberPage } from '@/components/layout/MemberPage'
import {
  PortalCard,
  PortalCardContent,
  PortalCardHeader,
  PortalCardTitle,
  PortalIconTile,
} from '@/components/member/PortalCard'
import { Skeleton } from '@/components/ui/skeleton'
import { sectionDelays, Stagger } from '@/components/motion/Stagger'
import { memberInsetPanelClass, memberResultsGridClass } from '@/lib/design-tokens'
import { optimizeCloudinaryUrl } from '@/lib/cloudinary'
import { accentScope } from '@/lib/portal-accent'
import { PUBLISHED_RESULTS_QUERY_KEY, PUBLISHED_RESULTS_STALE_MS } from '@/lib/query-sync'
import { cn } from '@/lib/utils'

function ResultsHero({ electionName }: { electionName: string }) {
  return (
    <PortalCard raised className="text-center">
      <PortalCardContent className="flex flex-col items-center">
        <PortalIconTile size="lg">
          <Trophy className="h-7 w-7 sm:h-8 sm:w-8" />
        </PortalIconTile>
        <p className="portal-accent-text mt-4 text-xs font-semibold uppercase tracking-[0.14em]">
          Official results
        </p>
        <h2 className="portal-heading mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
          {electionName}
        </h2>
        <p className="portal-subtle mx-auto mt-2 max-w-lg text-sm sm:text-base">
          Published winners and vote counts for each executive position.
        </p>
      </PortalCardContent>
    </PortalCard>
  )
}

export function PublishedResultsPage() {
  const { data: results, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: PUBLISHED_RESULTS_QUERY_KEY,
    queryFn: fetchPublishedResults,
    staleTime: PUBLISHED_RESULTS_STALE_MS,
    refetchOnWindowFocus: false,
  })

  if (isLoading) {
    return (
      <MemberPage>
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </MemberPage>
    )
  }

  if (isError) {
    return (
      <MemberPage>
        <MemberPageHeader title="Election Results" description="Published winners and vote counts" />
        <QueryErrorState onRetry={() => void refetch()} isRetrying={isFetching} />
      </MemberPage>
    )
  }

  if (!results?.positions?.length) {
    return (
      <MemberPage>
        <MemberPageHeader title="Election Results" description="Published winners and vote counts" />
        <EmptyState
          icon={Trophy}
          variant="member"
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
            <PortalCard key={position.position_id} raised>
              <PortalCardHeader>
                <PortalCardTitle>{position.position_name}</PortalCardTitle>
                <p className="portal-subtle mt-1 text-sm">
                  {position.academic_year} · {position.total_votes} vote
                  {position.total_votes === 1 ? '' : 's'} cast
                </p>
              </PortalCardHeader>

              <PortalCardContent className="space-y-5">
                {winners && winners.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {winners.map((winner) => (
                      <div
                        key={winner.candidate_id}
                        className={cn(
                          memberInsetPanelClass,
                          accentScope('success'),
                          'flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4',
                        )}
                      >
                        <img
                          src={optimizeCloudinaryUrl(winner.photo_url, 96)}
                          alt=""
                          className="h-16 w-16 shrink-0 rounded-2xl border-2 border-portal-surface object-cover shadow-portal sm:h-20 sm:w-20"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="portal-accent-text flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em]">
                            <Medal className="h-3.5 w-3.5" aria-hidden="true" />
                            Winner
                          </p>
                          <p className="portal-heading mt-1 text-lg font-bold leading-snug sm:text-xl">
                            {winner.full_name}
                          </p>
                          <p className="portal-subtle mt-0.5 text-sm">
                            {winner.vote_count} votes ({winner.vote_percentage}%)
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="portal-subtle text-sm">No votes recorded for this position.</p>
                )}

                {position.candidates.length > 1 ? (
                  <div className="space-y-3">
                    <p className="portal-heading text-sm font-semibold">All candidates</p>
                    <ul className="space-y-1.5 text-sm">
                      {position.candidates.map((candidate) => (
                        <li
                          key={candidate.candidate_id}
                          className="flex flex-col gap-1 rounded-xl border border-transparent px-3 py-2.5 transition-colors hover:border-portal-border hover:bg-portal-muted sm:flex-row sm:items-center sm:justify-between sm:gap-2"
                        >
                          <span className="portal-body min-w-0 break-words font-semibold">
                            #{candidate.rank} {candidate.full_name}
                          </span>
                          <span className="portal-subtle shrink-0 tabular-nums">
                            {candidate.vote_count} ({candidate.vote_percentage}%)
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </PortalCardContent>
            </PortalCard>
          )
        })}
      </div>
    </MemberPage>
  )
}
