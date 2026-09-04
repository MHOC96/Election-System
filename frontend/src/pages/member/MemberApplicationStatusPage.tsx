import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardList, Flag, Hourglass, Sparkles } from 'lucide-react'
import { fetchMyApplications, type CandidateApplication } from '@/api/applications'
import { useOngoingElection } from '@/hooks/useOngoingElection'
import { ApplicationStatusBadge } from '@/components/applications/ApplicationStatusBadge'
import { ApplicationRejectionNotice } from '@/components/applications/ApplicationRejectionNotice'
import { ApplicationProfileFrame } from '@/components/applications/ApplicationProfileFrame'
import {
  ApplicationReviewTimeline,
  buildApplicationTimelineSteps,
} from '@/components/applications/ApplicationReviewTimeline'
import { CountdownExpiryWatcher } from '@/components/shared/CountdownDisplay'
import { VotingStartsSoonCard } from '@/components/voting/VotingStartsSoonCard'
import { QueryErrorState } from '@/components/shared/QueryErrorState'
import { EmptyState } from '@/components/shared/EmptyState'
import { MemberPageHeader } from '@/components/member/MemberPageHeader'
import {
  PortalCard,
  PortalCardContent,
  PortalChip,
  PortalIconTile,
} from '@/components/member/PortalCard'
import { Skeleton } from '@/components/ui/skeleton'
import { sectionDelays, Stagger } from '@/components/motion/Stagger'
import { MemberPage } from '@/components/layout/MemberPage'
import { memberCalloutClass, memberHeroSpacingClass } from '@/lib/design-tokens'
import { isVotingStartPending } from '@/lib/election-lifecycle-ui'
import { ONGOING_ELECTION_QUERY_KEY, APPLICATIONS_STALE_MS } from '@/lib/query-sync'
import { useDocumentVisible } from '@/lib/useDocumentVisible'
import { accentScope } from '@/lib/portal-accent'
import { cn, formatDate } from '@/lib/utils'
import type { Election, ElectionPhase } from '@/types/api'

function getPhaseCopy(phase: ElectionPhase | undefined) {
  switch (phase) {
    case 'REVIEWING':
      return {
        title: 'Review is underway',
        description:
          'Applications are closed. Follow your progress below while the committee reviews submissions.',
      }
    case 'READY_FOR_VOTING':
      return {
        title: 'Application status',
        description: 'Your review timeline and decision are below. Voting opens when the timer reaches zero.',
      }
    case 'VOTING_CLOSED':
      return {
        title: 'Election update',
        description: 'Voting has ended. Your candidacy summary and review history are below.',
      }
    default:
      return {
        title: 'Application status',
        description: 'Track your candidate application from submission through committee review.',
      }
  }
}

function getApplicationFootnote(
  phase: ElectionPhase | undefined,
  status: CandidateApplication['status'],
): string | null {
  if (status === 'PENDING_REVIEW') {
    return 'You will be notified on this page when the committee accepts or rejects your application.'
  }

  if (status === 'REJECTED') return null

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

function ApplicationStatusSkeleton() {
  return (
    <MemberPage>
      <Skeleton className="h-11 w-64 rounded-xl" />
      <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <Skeleton className="mx-auto h-28 w-28 rounded-[1.35rem] sm:mx-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-8 w-32 rounded-full" />
          </div>
        </div>
        <div className="mt-6 space-y-4">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </div>
    </MemberPage>
  )
}

function VotingEndedHero({
  electionName,
  votingEndAt,
}: {
  electionName: string
  votingEndAt: string | null | undefined
}) {
  return (
    <PortalCard raised className="text-center">
      <PortalCardContent className="flex flex-col items-center">
        <PortalIconTile size="lg">
          <Flag className="h-7 w-7 sm:h-8 sm:w-8" />
        </PortalIconTile>

        <div className="mt-5 space-y-2.5">
          <PortalChip className="mx-auto">Ballot closed</PortalChip>
          <h2 className="portal-heading text-2xl font-bold tracking-tight sm:text-3xl">
            Voting has ended
          </h2>
          <p className="portal-subtle mx-auto max-w-lg text-sm leading-relaxed sm:text-base">
            The voting period for{' '}
            <span className="portal-body font-semibold">{electionName}</span> is now complete.
            {votingEndAt ? (
              <>
                {' '}
                Voting closed on{' '}
                <span className="portal-body font-semibold">{formatDate(votingEndAt)}</span>.
              </>
            ) : null}
          </p>
          <p className="portal-subtle mx-auto flex max-w-md items-center justify-center gap-2 text-sm">
            <Hourglass className="portal-accent-text h-4 w-4 shrink-0" aria-hidden="true" />
            Official results will appear here once they are published.
          </p>
        </div>
      </PortalCardContent>
    </PortalCard>
  )
}

interface ApplicationStatusPanelProps {
  application: CandidateApplication
  election: Election
  phase: ElectionPhase | undefined
  variant?: 'active' | 'post-voting'
}

function ApplicationStatusPanel({
  application,
  election,
  phase,
  variant = 'active',
}: ApplicationStatusPanelProps) {
  const footnote = getApplicationFootnote(phase, application.status)
  const timelineSteps = buildApplicationTimelineSteps(application, phase)
  const isApproved = application.status === 'APPROVED'
  const showBallotChip = isApproved && (variant === 'post-voting' || phase === 'READY_FOR_VOTING')

  return (
    <PortalCard
      raised
      className={cn(isApproved && accentScope('success'))}
      aria-labelledby="application-status-heading"
    >
      <PortalCardContent className="space-y-6 sm:space-y-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6 lg:gap-8">
          <div className="flex flex-col items-center gap-4 sm:items-start">
            <ApplicationProfileFrame
              photoUrl={application.photo_url}
              alt={`${application.full_name} profile photo`}
              size="lg"
            />
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <ApplicationStatusBadge status={application.status} size="lg" />
              {showBallotChip ? (
                <PortalChip>
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  On the ballot
                </PortalChip>
              ) : null}
            </div>
          </div>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="portal-accent-text text-[11px] font-semibold uppercase tracking-[0.14em]">
              {election.name}
            </p>
            <h2
              id="application-status-heading"
              className="portal-heading mt-2 text-balance text-2xl font-bold leading-tight tracking-tight sm:text-3xl"
            >
              {application.position_name}
            </h2>
            <p className="portal-body mt-2 text-base font-semibold sm:text-lg">
              {application.full_name}
            </p>
            <p className="portal-subtle mt-2 text-sm">
              Candidate application · submitted {formatDate(application.submitted_at)}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-muted/15 p-4 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.65)] dark:border-border/80 dark:bg-muted/10 dark:shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04)] sm:p-5 lg:p-6">
          <ApplicationReviewTimeline steps={timelineSteps} />
        </div>

        {application.status === 'REJECTED' ? (
          <ApplicationRejectionNotice reason={application.rejection_reason} />
        ) : footnote ? (
          <div className={cn(memberCalloutClass, 'text-sm leading-relaxed sm:text-base')}>
            <p>{footnote}</p>
          </div>
        ) : null}

        {variant === 'post-voting' && isApproved ? (
          <p className="portal-body text-center text-sm leading-relaxed sm:text-left sm:text-base">
            Thank you for standing in the election. Members were able to vote for this position
            while the ballot was open. Official results will be posted here when published.
          </p>
        ) : null}

        {variant === 'post-voting' && !isApproved && application.status !== 'REJECTED' ? (
          <p className="portal-subtle text-center text-sm leading-relaxed sm:text-left sm:text-base">
            Your application status is shown above. Contact the election committee if you have
            questions.
          </p>
        ) : null}
      </PortalCardContent>
    </PortalCard>
  )
}

export function MemberApplicationStatusPage() {
  const queryClient = useQueryClient()
  const documentVisible = useDocumentVisible()
  const {
    data: election,
    isLoading: loadingElection,
    isError: electionError,
    refetch: refetchElection,
    isFetching: fetchingElection,
  } = useOngoingElection()

  const {
    data: myApplications,
    isLoading: loadingApplications,
    isError: applicationsError,
    refetch: refetchApplications,
    isFetching: fetchingApplications,
  } = useQuery({
    queryKey: ['applications', 'me'],
    queryFn: fetchMyApplications,
    staleTime: APPLICATIONS_STALE_MS,
    refetchInterval: (query) => {
      if (!documentVisible) return false
      const apps = query.state.data
      const current = apps?.find((app) => app.election === election?.id)
      return current?.status === 'PENDING_REVIEW' ? 10_000 : 30_000
    },
    refetchIntervalInBackground: false,
    enabled: !!election,
  })

  const application = myApplications?.find((app) => app.election === election?.id)
  const phase = election?.current_phase
  const phaseCopy = getPhaseCopy(phase)
  const isPostVoting = phase === 'VOTING_CLOSED'
  const isLoading = loadingElection || loadingApplications
  const isError = electionError || applicationsError

  if (isLoading) {
    return <ApplicationStatusSkeleton />
  }

  if (isError) {
    return (
      <MemberPage>
        <MemberPageHeader title="Application status" />
        <QueryErrorState
          onRetry={() => {
            if (electionError) void refetchElection()
            if (applicationsError) void refetchApplications()
          }}
          isRetrying={fetchingElection || fetchingApplications}
        />
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
        ) : (
          <ApplicationStatusPanel
            application={application}
            election={election}
            phase={phase}
            variant={isPostVoting ? 'post-voting' : 'active'}
          />
        )}
      </Stagger>
    </MemberPage>
  )
}
