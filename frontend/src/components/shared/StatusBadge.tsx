import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
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
  className?: string
  children?: React.ReactNode
}

export function ElectionStatusBadge({ status, className, children }: ElectionStatusBadgeProps) {
  const variant =
    status === 'VOTING_OPEN'
      ? 'success'
      : status === 'APPLICATIONS_OPEN' || status === 'REVIEWING'
        ? 'warning'
        : status === 'ARCHIVED'
          ? 'secondary'
          : 'outline'

  const label = children ?? status.replace(/_/g, ' ')
  return (
    <Badge variant={variant} className={cn(className)}>
      {label}
    </Badge>
  )
}
