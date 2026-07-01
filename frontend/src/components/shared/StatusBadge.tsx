import { Badge } from '@/components/ui/badge'
import type { ElectionStatus } from '@/types/api'

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
  status: ElectionStatus
}

export function ElectionStatusBadge({ status }: ElectionStatusBadgeProps) {
  const variant =
    status === 'ACTIVE'
      ? 'success'
      : status === 'STOPPED'
        ? 'warning'
        : status === 'CLOSED'
          ? 'secondary'
          : 'outline'

  return <Badge variant={variant}>{status}</Badge>
}

interface AuditActionBadgeProps {
  action: string
}

export function AuditActionBadge({ action }: AuditActionBadgeProps) {
  return (
    <Badge variant="muted" className="font-mono text-[11px] font-medium uppercase tracking-wide">
      {action}
    </Badge>
  )
}
