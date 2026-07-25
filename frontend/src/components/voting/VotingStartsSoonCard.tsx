import { Vote } from 'lucide-react'
import { PortalPhaseHero } from '@/components/member/PortalPhaseHero'
import { VotingScheduleDetails } from '@/components/voting/VotingScheduleDetails'

interface VotingStartsSoonCardProps {
  electionName: string
  targetAt: string | null
  votingEndAt?: string | null
  className?: string
}

/** Member card counting down to the moment voting opens. */
export function VotingStartsSoonCard({
  electionName,
  targetAt,
  votingEndAt,
  className,
}: VotingStartsSoonCardProps) {
  return (
    <PortalPhaseHero
      icon={Vote}
      eyebrow="Voting"
      title="Voting starts soon"
      subtitle={electionName}
      countdownTargetAt={targetAt}
      countdownLabel="Time remaining until voting starts"
      className={className}
      footer={
        <VotingScheduleDetails
          votingStartAt={targetAt}
          votingEndAt={votingEndAt}
          className="justify-center"
        />
      }
    />
  )
}
