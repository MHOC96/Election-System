import { memo, useCallback, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarCheck, CheckCircle2, Vote } from 'lucide-react'
import { fetchBallot, submitVote } from '@/api/votes'
import { ElectionCountdownHero } from '@/components/elections/ElectionCountdownHero'
import { CountdownExpiryWatcher } from '@/components/shared/CountdownDisplay'
import { ElectionProgressCard } from '@/components/voting/ElectionProgressCard'
import { VotingStartsSoonCard } from '@/components/voting/VotingStartsSoonCard'
import { CandidateCard } from '@/components/voting/CandidateCard'
import { MemberSelectionItem } from '@/components/voting/MemberSelectionItem'
import { VoteConfirmDialog } from '@/components/voting/VoteConfirmDialog'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { QueryErrorState } from '@/components/shared/QueryErrorState'
import { MemberPage } from '@/components/layout/MemberPage'
import { MemberSection } from '@/components/member/MemberSection'
import {
  PortalCard,
  PortalCardContent,
  PortalCardDescription,
  PortalCardHeader,
  PortalCardTitle,
  PortalChip,
} from '@/components/member/PortalCard'
import { sectionDelays, Stagger, StaggerChildren } from '@/components/motion/Stagger'
import { memberCandidateGridClass, memberHeroSpacingClass } from '@/lib/design-tokens'
import { BALLOT_QUERY_KEY, BALLOT_STALE_MS, ONGOING_ELECTION_QUERY_KEY } from '@/lib/query-sync'
import { isVotingStartPending } from '@/lib/election-lifecycle-ui'
import { handleRadioGroupKeyDown } from '@/lib/a11y'
import { accentScope } from '@/lib/portal-accent'
import { cn } from '@/lib/utils'
import type { BallotItem, Candidate } from '@/types/api'
import { notifyApiError, notifySuccessMessage } from '@/lib/notify'
import { SUCCESS_MESSAGES } from '@/lib/user-messages'

interface PendingVote {
  positionId: number
  candidateId: number
  candidateName: string
  candidatePhoto: string
  positionName: string
}

export function BallotPage() {
  const queryClient = useQueryClient()
  const [pendingVote, setPendingVote] = useState<PendingVote | null>(null)

  const ballotQuery = useQuery({
    queryKey: BALLOT_QUERY_KEY,
    queryFn: fetchBallot,
    staleTime: BALLOT_STALE_MS,
    placeholderData: (previous) => previous,
    retry: false,
  })

  const votingStartAt = ballotQuery.data?.election?.voting_start_at ?? null
  const votingEndAt = ballotQuery.data?.election?.voting_end_at ?? null
  const isVotingUpcoming =
    !!ballotQuery.data?.election && isVotingStartPending(ballotQuery.data.election)
  
  const countdownTarget = isVotingUpcoming ? votingStartAt : (ballotQuery.data?.can_vote ? votingEndAt : null)

  const handleCountdownExpire = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: BALLOT_QUERY_KEY })
    void queryClient.invalidateQueries({ queryKey: ONGOING_ELECTION_QUERY_KEY })
  }, [queryClient])

  const handleSelectCandidate = useCallback(
    (
      positionId: number,
      positionName: string,
      candidate: Candidate,
    ) => {
      setPendingVote({
        positionId,
        candidateId: candidate.id,
        candidateName: candidate.full_name,
        candidatePhoto: candidate.photo_url,
        positionName,
      })
    },
    [],
  )

  const voteMutation = useMutation({
    mutationFn: ({ positionId, candidateId }: { positionId: number; candidateId: number }) =>
      submitVote(positionId, candidateId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: BALLOT_QUERY_KEY })
      notifySuccessMessage(SUCCESS_MESSAGES.voteRecorded)
      setPendingVote(null)
    },
    onError: (err) => {
      notifyApiError(err, 'vote')
      setPendingVote(null)
    },
  })

  if (ballotQuery.isPending && !ballotQuery.data) {
    return (
      <MemberPage>
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </MemberPage>
    )
  }

  if (ballotQuery.isError) {
    return (
      <MemberPage>
        <QueryErrorState
          onRetry={() => void ballotQuery.refetch()}
          isRetrying={ballotQuery.isFetching}
        />
      </MemberPage>
    )
  }

  const ballot = ballotQuery.data
  const voteStatus = ballot?.vote_status
  const electionEnded = ballot?.election_ended || voteStatus?.election_ended

  if (electionEnded) {
    return (
      <MemberPage>
        <EmptyState
          icon={CalendarCheck}
          variant="member"
          title="This election has ended"
          description="Election details and your selections are no longer shown after an election closes."
        />
      </MemberPage>
    )
  }

  if (!ballot?.election) {
    return (
      <MemberPage>
        <EmptyState
          icon={Vote}
          variant="member"
          title="No election in progress"
          description="When an election starts, you will be able to view details and cast your votes here."
        />
      </MemberPage>
    )
  }

  const positions = ballot.positions.filter((item) => item.candidates.length > 0)
  const votedCount = voteStatus?.positions_voted ?? positions.filter((p) => p.has_voted).length
  const total = voteStatus?.positions_total ?? positions.length
  const canVote = ballot.can_vote
  const selections = voteStatus?.votes ?? []

  if (positions.length === 0) {
    return (
      <MemberPage>
        <EmptyState
          icon={Vote}
          variant="member"
          title="No candidates yet"
          description="Positions will appear here once candidates are registered for the election."
        />
      </MemberPage>
    )
  }

  return (
    <MemberPage>
      {ballot.election && isVotingUpcoming ? (
        <Stagger delayMs={sectionDelays.primary}>
          <CountdownExpiryWatcher targetAt={countdownTarget} onExpire={handleCountdownExpire} />
          <VotingStartsSoonCard
            electionName={ballot.election.name}
            targetAt={countdownTarget}
            votingEndAt={votingEndAt}
            className={memberHeroSpacingClass}
          />
        </Stagger>
      ) : null}

      {ballot.election && canVote ? (
        <Stagger delayMs={sectionDelays.primary}>
          <CountdownExpiryWatcher targetAt={countdownTarget} onExpire={handleCountdownExpire} />
          <ElectionCountdownHero
            variant="voting-open"
            electionName={ballot.election.name}
            targetAt={countdownTarget}
            className={memberHeroSpacingClass}
          />
        </Stagger>
      ) : null}

      {!isVotingUpcoming ? (
      <Stagger delayMs={sectionDelays.primary}>
        <ElectionProgressCard
          electionName={ballot.election.name}
          status={ballot.election.current_phase}
          votedCount={votedCount}
          total={total}
          canVote={canVote}
        />
      </Stagger>
      ) : null}

      {selections.length > 0 && (
        <Stagger delayMs={sectionDelays.secondary}>
          <MemberSection
            id="my-selections"
            title="Your selections"
            description="Only you can see who you voted for"
            badge={
              <PortalChip
                className={cn(
                  'tabular-nums',
                  voteStatus?.all_positions_voted && accentScope('success'),
                )}
              >
                {votedCount}/{total}
              </PortalChip>
            }
          >
            <StaggerChildren className={memberCandidateGridClass} staggerMs={60}>
              {selections.map((vote) => (
                <MemberSelectionItem
                  key={vote.position_id}
                  positionName={vote.position_name}
                  candidateName={vote.candidate_name}
                  votedAt={vote.voted_at}
                />
              ))}
            </StaggerChildren>
          </MemberSection>
        </Stagger>
      )}

      <Stagger delayMs={selections.length > 0 ? sectionDelays.tertiary : sectionDelays.secondary}>
        <MemberSection
          id="vote-positions"
          title={canVote ? 'Cast your votes' : isVotingUpcoming ? 'Ballot preview' : 'Election positions'}
          description={
            canVote
              ? 'Select one candidate for each position. Each choice is final once submitted.'
              : isVotingUpcoming
                ? 'Review candidates below. Voting opens when the timer above reaches zero.'
                : 'Voting is not open. You can review candidates and your recorded selections.'
          }
        >
          <StaggerChildren className="space-y-5 lg:space-y-6" staggerMs={80} initialDelayMs={40}>
            {positions.map((item, index) => (
              <PositionSection
                key={item.position.id}
                item={item}
                index={index}
                canVote={canVote}
                isVotingUpcoming={isVotingUpcoming}
                onSelectCandidate={handleSelectCandidate}
              />
            ))}
          </StaggerChildren>
        </MemberSection>
      </Stagger>

      {pendingVote && (
        <VoteConfirmDialog
          open
          candidateName={pendingVote.candidateName}
          candidatePhoto={pendingVote.candidatePhoto}
          positionName={pendingVote.positionName}
          loading={voteMutation.isPending}
          onCancel={() => setPendingVote(null)}
          onConfirm={() =>
            voteMutation.mutate({
              positionId: pendingVote.positionId,
              candidateId: pendingVote.candidateId,
            })
          }
        />
      )}
    </MemberPage>
  )
}

const PositionSection = memo(function PositionSection({
  item,
  index,
  canVote,
  isVotingUpcoming,
  onSelectCandidate,
}: {
  item: BallotItem
  index: number
  canVote: boolean
  isVotingUpcoming: boolean
  onSelectCandidate: (
    positionId: number,
    positionName: string,
    candidate: Candidate,
  ) => void
}) {
  const sectionId = `position-${item.position.id}-label`
  const votingDisabled = !canVote || item.has_voted
  const handleSelect = useCallback(
    (candidate: Candidate) => {
      onSelectCandidate(item.position.id, item.position.name, candidate)
    },
    [item.position.id, item.position.name, onSelectCandidate],
  )

  return (
    <PortalCard as="section">
      <PortalCardHeader
        // A completed position turns green so members can scan the ballot.
        className={cn(item.has_voted && accentScope('success'))}
      >
        <div className="flex min-w-0 flex-col items-start justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="min-w-0">
            <PortalCardTitle as="h3" id={sectionId}>
              {item.position.name}
            </PortalCardTitle>
            <PortalCardDescription>
              {item.has_voted
                ? 'Your vote for this position is recorded'
                : canVote
                  ? 'Choose one candidate'
                  : isVotingUpcoming
                    ? 'Voting opens soon'
                    : 'Waiting for voting to resume'}
            </PortalCardDescription>
          </div>
          {item.has_voted ? (
            <PortalChip>
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Voted
            </PortalChip>
          ) : null}
        </div>
      </PortalCardHeader>

      <PortalCardContent>
        <div
          role="radiogroup"
          aria-labelledby={sectionId}
          aria-readonly={votingDisabled || undefined}
          className={memberCandidateGridClass}
          onKeyDown={handleRadioGroupKeyDown}
        >
          {item.candidates.map((candidate, candidateIndex) => {
            const isRecorded = item.has_voted && item.my_candidate_id === candidate.id

            return (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                isRecorded={isRecorded}
                disabled={votingDisabled}
                priority={index === 0 && candidateIndex === 0}
                onSelect={() => handleSelect(candidate)}
              />
            )
          })}
        </div>
      </PortalCardContent>
    </PortalCard>
  )
})
