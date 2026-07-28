import type { ReactNode } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { memberPageBlockClass } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

interface MemberPageHeaderProps {
  title: string
  description?: string
  meta?: string
  action?: ReactNode
  className?: string
}

/** Member pages use the same header primitive as admin, aligned to the portal column width. */
export function MemberPageHeader({ className, ...props }: MemberPageHeaderProps) {
  return <PageHeader {...props} className={cn(memberPageBlockClass, className)} />
}
