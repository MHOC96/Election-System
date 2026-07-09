import { Badge } from '@/components/ui/badge'
import type { ElectionPhase } from '@/types/api'

interface MemberStatusBadgeProps {
  isActive: boolean
}

export function MemberStatusBadge({ isActive }: MemberStatusBadgeProps) {
  return (
    <Badge variant={isActive ? 'success' : 'muted'}>
      {isActive ? 'Active' : 'Inactive'}
    </Badge>
  )
}

interface ElectionStatusBadgeProps {
  status: ElectionPhase
}

export function ElectionStatusBadge({ status }: ElectionStatusBadgeProps) {
  const variant =
    status === 'VOTING_OPEN'
      ? 'success'
      : status === 'APPLICATIONS_OPEN' || status === 'REVIEWING'
        ? 'warning'
        : status === 'ARCHIVED'
          ? 'secondary'
          : 'outline'

  const label = status.replace(/_/g, ' ')
  return <Badge variant={variant}>{label}</Badge>
}
