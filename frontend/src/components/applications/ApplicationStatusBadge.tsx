import { Clock, CheckCircle2, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { CandidateApplication } from '@/api/applications'

export function ApplicationStatusBadge({
  status,
  className,
}: {
  status: CandidateApplication['status']
  className?: string
}) {
  switch (status) {
    case 'PENDING_REVIEW':
      return (
        <Badge variant="warning" className={className}>
          <Clock className="mr-1 h-3 w-3" aria-hidden="true" />
          Pending review
        </Badge>
      )
    case 'APPROVED':
      return (
        <Badge variant="success" className={className}>
          <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden="true" />
          Accepted
        </Badge>
      )
    case 'REJECTED':
      return (
        <Badge variant="destructive" className={className}>
          <XCircle className="mr-1 h-3 w-3" aria-hidden="true" />
          Not approved
        </Badge>
      )
    default:
      return <Badge className={className}>{status}</Badge>
  }
}
