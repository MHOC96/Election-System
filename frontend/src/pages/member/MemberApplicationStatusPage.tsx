import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardList } from 'lucide-react'
import { fetchMyApplications } from '@/api/applications'
import { useOngoingElection } from '@/hooks/useOngoingElection'
import { ApplicationStatusBadge } from '@/components/applications/ApplicationStatusBadge'
import { ElectionCountdownHero } from '@/components/elections/ElectionCountdownHero'
import { CountdownExpiryWatcher } from '@/components/shared/CountdownDisplay'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { sectionDelays, Stagger } from '@/components/motion/Stagger'
import { pageLayoutClass } from '@/lib/design-tokens'
import { isVotingStartPending } from '@/lib/election-lifecycle-ui'
import { ONGOING_ELECTION_QUERY_KEY } from '@/lib/query-sync'
import { optimizeCloudinaryUrl } from '@/lib/cloudinary'
import { formatDate } from '@/lib/utils'
import type { ElectionPhase } from '@/types/api'

function getPhaseCopy(phase: ElectionPhase | undefined) {
  switch (phase) {
    case 'REVIEWING':
      return {
        title: 'Review is underway',
        description:
          'Applications are closed. The admin is reviewing submissions. Your decision will appear below.',
      }
    case 'READY_FOR_VOTING':
      return {
        title: 'Review complete',
        description: 'Voting will open soon. Check below for your application outcome.',
      }
    case 'VOTING_CLOSED':
      return {
        title: 'Voting has ended',
        description: 'Results will be published shortly. Your application outcome is below.',
      }
    default:
      return {
        title: 'Application status',
        description: 'View the outcome of your candidate application.',
      }
  }
}

export function MemberApplicationStatusPage() {
  const queryClient = useQueryClient()
  const { data: election, isLoading: loadingElection } = useOngoingElection()

  const { data: myApplications, isLoading: loadingApplications } = useQuery({
    queryKey: ['applications', 'me'],
    queryFn: fetchMyApplications,
    refetchInterval: (query) => {
      const apps = query.state.data
      const current = apps?.find((app) => app.election === election?.id)
      return current?.status === 'PENDING_REVIEW' ? 10_000 : 30_000
    },
    enabled: !!election,
  })

  const application = myApplications?.find((app) => app.election === election?.id)
  const phaseCopy = getPhaseCopy(election?.current_phase)
  const isLoading = loadingElection || loadingApplications

  if (isLoading) {
    return (
      <div className={pageLayoutClass}>
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!election) {
    return (
      <div className={pageLayoutClass}>
        <PageHeader title="Application status" description="Member portal" />
        <EmptyState
          icon={ClipboardList}
          title="No active election"
          description="There is no election in progress right now."
        />
      </div>
    )
  }

  return (
    <div className={pageLayoutClass}>
      <Stagger delayMs={sectionDelays.header}>
        <PageHeader title={phaseCopy.title} description={phaseCopy.description} />
        {election && isVotingStartPending(election) && election.voting_start_at ? (
          <div className="mt-6 max-w-3xl">
            <CountdownExpiryWatcher
              targetAt={election.voting_start_at}
              onExpire={() => void queryClient.invalidateQueries({ queryKey: ONGOING_ELECTION_QUERY_KEY })}
            />
            <ElectionCountdownHero
              variant="voting-upcoming"
              electionName={election.name}
              targetAt={election.voting_start_at}
            />
          </div>
        ) : null}
      </Stagger>

      <Stagger delayMs={sectionDelays.primary}>
        {!application ? (
          <EmptyState
            icon={ClipboardList}
            title="No application on file"
            description="You did not submit an application for this election before the window closed."
          />
        ) : (
          <Card className="overflow-hidden border-primary/15 shadow-sm">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="text-lg">{election.name}</CardTitle>
              <CardDescription>Your candidate application</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                <img
                  src={optimizeCloudinaryUrl(application.photo_url, 96)}
                  alt=""
                  className="h-24 w-24 shrink-0 rounded-2xl border object-cover shadow-sm"
                />
                <div className="min-w-0 flex-1 space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Position applied for</p>
                    <p className="text-lg font-semibold">{application.position_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Applicant name</p>
                    <p className="font-medium">{application.full_name}</p>
                  </div>
                  <div>
                    <p className="mb-2 text-sm text-muted-foreground">Decision</p>
                    <ApplicationStatusBadge
                      status={application.status}
                      reason={application.rejection_reason}
                    />
                  </div>
                  {application.status === 'PENDING_REVIEW' ? (
                    <p className="text-sm text-muted-foreground">
                      You will be notified here when the admin accepts or rejects your application.
                    </p>
                  ) : null}
                  {application.status === 'APPROVED' ? (
                    <p className="text-sm text-muted-foreground">
                      Your application was accepted. You are on the ballot for this position once voting opens.
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    Submitted {formatDate(application.submitted_at)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </Stagger>
    </div>
  )
}
