import { Clock, CheckCircle2, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { CandidateApplication } from '@/api/applications'

export function ApplicationStatusBadge({
  status,
  reason,
  className,
}: {
  status: CandidateApplication['status']
  reason?: string
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
        <div className={`flex flex-col items-start gap-1.5 ${className ?? ''}`}>
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" aria-hidden="true" />
            Rejected
          </Badge>
          {reason ? <p className="text-sm text-muted-foreground">{reason}</p> : null}
        </div>
      )
    default:
      return <Badge className={className}>{status}</Badge>
  }
}
