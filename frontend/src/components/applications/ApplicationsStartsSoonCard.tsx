import { Sparkles } from 'lucide-react'
import { PortalPhaseHero } from '@/components/member/PortalPhaseHero'
import { formatDate } from '@/lib/utils'

interface ApplicationsStartsSoonCardProps {
  electionName: string
  targetAt: string | null
  className?: string
}

/** Member card shown while applications are scheduled but not yet open. */
export function ApplicationsStartsSoonCard({
  electionName,
  targetAt,
  className,
}: ApplicationsStartsSoonCardProps) {
  return (
    <PortalPhaseHero
      icon={Sparkles}
      eyebrow="Candidate applications"
      title="Applications opening soon"
      subtitle={electionName}
      meta={targetAt ? `Opens · ${formatDate(targetAt)}` : undefined}
      blurb="When the countdown ends you can apply for one position. Have your photo and declaration PDF ready."
      countdownTargetAt={targetAt}
      countdownLabel="Time until applications open"
      className={className}
    />
  )
}
