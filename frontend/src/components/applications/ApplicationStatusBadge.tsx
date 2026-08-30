import { Clock, CheckCircle2, XCircle, Ban } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { CandidateApplication } from '@/api/applications'
import { cn } from '@/lib/utils'

const SIZE_CLASS = {
  sm: 'h-auto gap-1.5 px-2.5 py-1 text-xs [&_svg]:size-3',
  md: 'h-auto gap-2 px-3 py-1.5 text-sm [&_svg]:size-3.5',
  lg: 'h-auto gap-2 px-3.5 py-1.5 text-sm sm:text-base [&_svg]:size-4',
} as const

export function ApplicationStatusBadge({
  status,
  className,
  size = 'md',
}: {
  status: CandidateApplication['status']
  className?: string
  size?: keyof typeof SIZE_CLASS
}) {
  const sizeClass = SIZE_CLASS[size]

  switch (status) {
    case 'PENDING_REVIEW':
      return (
        <Badge variant="warning" className={cn(sizeClass, className)}>
          <Clock aria-hidden="true" />
          Pending review
        </Badge>
      )
    case 'APPROVED':
      return (
        <Badge variant="success" className={cn(sizeClass, className)}>
          <CheckCircle2 aria-hidden="true" />
          Accepted
        </Badge>
      )
    case 'REJECTED':
      return (
        <Badge variant="destructive" className={cn(sizeClass, className)}>
          <XCircle aria-hidden="true" />
          Not approved
        </Badge>
      )
    case 'WITHDRAWN':
      return (
        <Badge
          variant="muted"
          className={cn(sizeClass, 'border-border/70 ring-1 ring-inset ring-border/50', className)}
        >
          <Ban aria-hidden="true" />
          Withdrawn
        </Badge>
      )
    case 'DRAFT':
      return (
        <Badge variant="outline" className={cn(sizeClass, className)}>
          Draft
        </Badge>
      )
    default:
      return (
        <Badge className={cn(sizeClass, className)}>
          {status}
        </Badge>
      )
  }
}
