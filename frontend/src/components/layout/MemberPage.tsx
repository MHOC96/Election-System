import { memberPageLayoutClass } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

interface MemberPageProps {
  children: React.ReactNode
  className?: string
}

/** Consistent vertical rhythm for all member portal pages. */
export function MemberPage({ children, className }: MemberPageProps) {
  return (
    <div className={cn(memberPageLayoutClass, 'overflow-x-hidden', className)}>{children}</div>
  )
}
