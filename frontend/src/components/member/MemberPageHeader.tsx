import type { ReactNode } from 'react'
import {
  memberPageDescriptionClass,
  memberPageTitleClass,
} from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

interface MemberPageHeaderProps {
  title: string
  description?: string
  meta?: string
  action?: ReactNode
  className?: string
}

export function MemberPageHeader({
  title,
  description,
  meta,
  action,
  className,
}: MemberPageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4',
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className={memberPageTitleClass}>{title}</h1>
        {description ? (
          <p className={memberPageDescriptionClass}>{description}</p>
        ) : null}
        {meta ? (
          <p className="mt-1.5 text-sm font-medium text-foreground/85">{meta}</p>
        ) : null}
      </div>
      {action ? (
        <div className="flex w-full min-w-0 shrink-0 sm:w-auto sm:justify-end">{action}</div>
      ) : null}
    </header>
  )
}
