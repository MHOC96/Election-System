import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardList, Flag, Hourglass, Sparkles } from 'lucide-react'
import { fetchMyApplications, type CandidateApplication } from '@/api/applications'
import { useOngoingElection } from '@/hooks/useOngoingElection'
import { ApplicationStatusBadge } from '@/components/applications/ApplicationStatusBadge'
import { ApplicationRejectionNotice } from '@/components/applications/ApplicationRejectionNotice'
import { CountdownExpiryWatcher } from '@/components/shared/CountdownDisplay'
import { VotingStartsSoonCard } from '@/components/voting/VotingStartsSoonCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { MemberPageHeader } from '@/components/member/MemberPageHeader'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { sectionDelays, Stagger } from '@/components/motion/Stagger'
import { MemberPage } from '@/components/layout/MemberPage'
import {
  memberCalloutClass,
  memberCardPaddingClass,
  memberCardSurfaceClass,
  memberHeroSpacingClass,
  memberHeroSurfaceClass,
  memberStatusCardClass,
} from '@/lib/design-tokens'
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
        description: 'Your application decision is below. Voting opens when the timer reaches zero.',
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
    return null
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
    <section className={cn(memberCardSurfaceClass, 'overflow-hidden')}>
      <div className={cn(memberCardPaddingClass, 'text-center', memberHeroSurfaceClass)}>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm sm:h-16 sm:w-16">
          <Flag className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden="true" />
        </div>
        <div className="mt-4 space-y-2 sm:mt-5">
          <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/15">
            Ballot closed
          </Badge>
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">Voting has ended</h2>
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
      </div>
    </section>
  )
}

function PostVotingOutcomeCard({ application }: { application: CandidateApplication }) {
  const isApproved = application.status === 'APPROVED'

  return (
    <Card className={memberCardSurfaceClass}>
      <div
        className={cn(
          'border-b px-5 py-7 text-center sm:px-8 sm:py-9 lg:px-10',
          isApproved
            ? 'bg-gradient-to-br from-primary/[0.08] via-card to-success/[0.06] dark:from-primary/[0.12] dark:via-card dark:to-success/[0.1]'
            : 'bg-muted/30 dark:bg-muted/20',
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
        <h3 className="mt-1 text-lg font-bold tracking-tight sm:text-xl md:text-2xl">{application.full_name}</h3>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">{application.position_name}</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <ApplicationStatusBadge status={application.status} />
          {isApproved ? (
            <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/15">
              <Sparkles className="mr-1 h-3 w-3" aria-hidden="true" />
              On the ballot
            </Badge>
          ) : null}
        </div>
      </div>

      <CardContent className={cn(memberCardPaddingClass, 'space-y-4 text-center')}>
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
          <ApplicationRejectionNotice reason={application.rejection_reason} />
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
    <Card className={memberCardSurfaceClass}>
      <div className={cn('border-b bg-muted/30 px-5 py-8 text-center sm:px-8 sm:py-10 lg:px-10')}>
        <p className="text-base font-semibold text-foreground sm:text-lg">{election.name}</p>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">Your candidate application</p>
        <img
          src={optimizeCloudinaryUrl(application.photo_url, 128)}
          alt=""
          className="mx-auto mt-5 h-24 w-24 rounded-2xl border-2 border-background object-cover shadow-md sm:mt-6 sm:h-28 sm:w-28 md:h-32 md:w-32"
        />
        <p className="mt-5 text-sm font-medium text-muted-foreground sm:mt-6 sm:text-base">Position</p>
        <h3 className="mt-1 text-balance text-xl font-bold leading-tight tracking-tight sm:text-2xl md:text-3xl">
          {application.position_name}
        </h3>
        <p className="mt-3 text-base font-medium text-foreground sm:text-lg">{application.full_name}</p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 sm:mt-6">
          <ApplicationStatusBadge
            status={application.status}
            className={cn(
              'h-auto gap-2 px-3.5 py-1.5 text-sm sm:text-base [&_svg]:size-4',
              application.status === 'REJECTED' && 'mx-auto',
            )}
          />
        </div>
      </div>

      <CardContent className={cn(memberCardPaddingClass, 'space-y-4 text-center sm:text-left')}>
        {application.status === 'REJECTED' ? (
          <ApplicationRejectionNotice reason={application.rejection_reason} />
        ) : footnote ? (
          <div className={cn(memberCalloutClass, 'text-base leading-relaxed')}>
            <p>{footnote}</p>
          </div>
        ) : null}

        <p className="text-sm text-muted-foreground">
          Submitted {formatDate(application.submitted_at)}
        </p>
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
      <MemberPage>
        <Skeleton className="h-12 w-64 rounded-2xl" />
        <Skeleton className="h-52 w-full rounded-3xl" />
      </MemberPage>
    )
  }

  if (!election) {
    return (
      <MemberPage>
        <MemberPageHeader title="Application status" />
        <EmptyState
          icon={ClipboardList}
          variant="member"
          title="No active election"
          description="There is no election in progress right now."
        />
      </MemberPage>
    )
  }

  return (
    <MemberPage>
      <Stagger delayMs={sectionDelays.header}>
        <MemberPageHeader title={phaseCopy.title} description={phaseCopy.description} />
        {isPostVoting ? (
          <div className={memberHeroSpacingClass}>
            <VotingEndedHero electionName={election.name} votingEndAt={election.voting_end_at} />
          </div>
        ) : null}
        {election && isVotingStartPending(election) && election.voting_start_at ? (
          <div className={memberHeroSpacingClass}>
            <CountdownExpiryWatcher
              targetAt={election.voting_start_at}
              onExpire={() => void queryClient.invalidateQueries({ queryKey: ONGOING_ELECTION_QUERY_KEY })}
            />
            <VotingStartsSoonCard
              electionName={election.name}
              targetAt={election.voting_start_at}
              votingEndAt={election.voting_end_at}
            />
          </div>
        ) : null}
      </Stagger>

      <Stagger delayMs={sectionDelays.primary}>
        {!application ? (
          <EmptyState
            icon={ClipboardList}
            variant="member"
            title="No application on file"
            description="You did not submit an application for this election before the window closed."
          />
        ) : isPostVoting ? (
          <div className={memberStatusCardClass}>
            <PostVotingOutcomeCard application={application} />
          </div>
        ) : (
          <div className={memberStatusCardClass}>
            <ActiveApplicationCard application={application} election={election} phase={phase} />
          </div>
        )}
      </Stagger>
    </MemberPage>
  )
}
