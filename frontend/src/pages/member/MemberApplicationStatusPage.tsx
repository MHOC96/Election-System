import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardList, Flag, Hourglass, Sparkles } from 'lucide-react'
import { fetchMyApplications, type CandidateApplication } from '@/api/applications'
import { useOngoingElection } from '@/hooks/useOngoingElection'
import { ApplicationStatusBadge } from '@/components/applications/ApplicationStatusBadge'
import { ElectionCountdownHero } from '@/components/elections/ElectionCountdownHero'
import { CountdownExpiryWatcher } from '@/components/shared/CountdownDisplay'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { sectionDelays, Stagger } from '@/components/motion/Stagger'
import { pageLayoutClass } from '@/lib/design-tokens'
import { isVotingStartPending } from '@/lib/election-lifecycle-ui'
import { ONGOING_ELECTION_QUERY_KEY } from '@/lib/query-sync'
import { optimizeCloudinaryUrl } from '@/lib/cloudinary'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Election, ElectionPhase } from '@/types/api'

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
        title: 'Application status',
        description: 'See your application decision below. The ballot countdown shows when voting begins.',
      }
    case 'VOTING_CLOSED':
      return {
        title: 'Election update',
        description: 'Voting has ended. See your candidacy summary below.',
      }
    default:
      return {
        title: 'Application status',
        description: 'View the outcome of your candidate application.',
      }
  }
}

function getApplicationFootnote(
  phase: ElectionPhase | undefined,
  status: CandidateApplication['status'],
): string | null {
  if (status === 'PENDING_REVIEW') {
    return 'You will be notified here when the admin accepts or rejects your application.'
  }

  if (status === 'REJECTED') {
    return phase === 'VOTING_CLOSED'
      ? 'Your application was not approved, so you were not placed on the ballot for this election.'
      : 'Your application was not approved for this election.'
  }

  if (status === 'APPROVED') {
    switch (phase) {
      case 'READY_FOR_VOTING':
        return 'You are on the ballot for this position. Voting opens when the countdown above reaches zero.'
      case 'VOTING_CLOSED':
        return null
      default:
        return 'Your application was accepted. You will appear on the ballot once voting is scheduled.'
    }
  }

  return null
}

function VotingEndedHero({
  electionName,
  votingEndAt,
}: {
  electionName: string
  votingEndAt: string | null | undefined
}) {
  return (
    <section className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-card via-primary/[0.04] to-chart-3/[0.06] p-6 text-center shadow-md sm:rounded-3xl sm:p-8">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm sm:h-16 sm:w-16">
        <Flag className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden="true" />
      </div>
      <div className="mt-4 space-y-2 sm:mt-5">
        <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/15">
          Ballot closed
        </Badge>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Voting has ended</h2>
        <p className="mx-auto max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
          The voting period for <span className="font-medium text-foreground">{electionName}</span>{' '}
          is now complete.
          {votingEndAt ? (
            <>
              {' '}
              Voting closed on <span className="font-medium text-foreground">{formatDate(votingEndAt)}</span>.
            </>
          ) : null}
        </p>
        <p className="mx-auto flex max-w-md items-center justify-center gap-2 text-sm text-muted-foreground">
          <Hourglass className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          Official results will appear here once they are published.
        </p>
      </div>
    </section>
  )
}

function PostVotingOutcomeCard({ application }: { application: CandidateApplication }) {
  const isApproved = application.status === 'APPROVED'

  return (
    <Card className="mx-auto w-full max-w-2xl overflow-hidden border-primary/15 shadow-md">
      <div
        className={cn(
          'border-b px-5 py-6 text-center sm:px-8 sm:py-8',
          isApproved
            ? 'bg-gradient-to-br from-primary/[0.08] via-card to-success/[0.06]'
            : 'bg-muted/30',
        )}
      >
        <img
          src={optimizeCloudinaryUrl(application.photo_url, 112)}
          alt=""
          className="mx-auto h-20 w-20 rounded-2xl border-2 border-background object-cover shadow-md sm:h-24 sm:w-24"
        />
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          {isApproved ? 'Your candidacy' : 'Application outcome'}
        </p>
        <h3 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">{application.full_name}</h3>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">{application.position_name}</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <ApplicationStatusBadge status={application.status} reason={application.rejection_reason} />
          {isApproved ? (
            <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/15">
              <Sparkles className="mr-1 h-3 w-3" aria-hidden="true" />
              On the ballot
            </Badge>
          ) : null}
        </div>
      </div>

      <CardContent className="space-y-4 px-5 py-6 text-center sm:px-8">
        {isApproved ? (
          <>
            <p className="text-sm leading-relaxed text-foreground sm:text-base">
              Thank you for standing in the election. Members were able to vote for this position while
              the ballot was open.
            </p>
            <p className="text-sm text-muted-foreground">
              We will post the official results on this page as soon as the admin publishes them.
            </p>
          </>
        ) : application.status === 'REJECTED' ? (
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            Your application was reviewed but not approved for this election, so you were not included on
            the ballot.
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            Your application status is shown above. Contact the election committee if you have questions.
          </p>
        )}
        <p className="text-xs text-muted-foreground">Applied {formatDate(application.submitted_at)}</p>
      </CardContent>
    </Card>
  )
}

function ActiveApplicationCard({
  application,
  election,
  phase,
}: {
  application: CandidateApplication
  election: Election
  phase: ElectionPhase | undefined
}) {
  const footnote = getApplicationFootnote(phase, application.status)

  return (
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
            className="mx-auto h-24 w-24 shrink-0 rounded-2xl border object-cover shadow-sm sm:mx-0"
          />
          <div className="min-w-0 flex-1 space-y-4 text-center sm:text-left">
            <div>
              <p className="text-sm text-muted-foreground">Position applied for</p>
              <p className="text-lg font-semibold">{application.position_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Applicant name</p>
              <p className="font-medium">{application.full_name}</p>
            </div>
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <p className="text-sm text-muted-foreground">Decision</p>
              <ApplicationStatusBadge
                status={application.status}
                reason={application.rejection_reason}
              />
            </div>
            {footnote ? (
              <p className="text-sm leading-relaxed text-muted-foreground">{footnote}</p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Submitted {formatDate(application.submitted_at)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
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
  const phase = election?.current_phase
  const phaseCopy = getPhaseCopy(phase)
  const isPostVoting = phase === 'VOTING_CLOSED'
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
        {isPostVoting ? (
          <div className="mt-6">
            <VotingEndedHero electionName={election.name} votingEndAt={election.voting_end_at} />
          </div>
        ) : null}
        {election && isVotingStartPending(election) && election.voting_start_at ? (
          <div className="mx-auto mt-6 w-full max-w-4xl">
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
        ) : isPostVoting ? (
          <PostVotingOutcomeCard application={application} />
        ) : (
          <ActiveApplicationCard application={application} election={election} phase={phase} />
        )}
      </Stagger>
    </div>
  )
}
