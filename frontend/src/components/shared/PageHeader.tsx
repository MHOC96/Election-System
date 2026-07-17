import type { ReactNode } from 'react'
import { pageTitleClass } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  meta?: string
  action?: ReactNode
  className?: string
}

export function PageHeader({ title, description, meta, action, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4',
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className={pageTitleClass}>{title}</h1>
        {description ? (
          <p className="mt-1 text-pretty text-sm text-muted-foreground">{description}</p>
        ) : null}
        {meta ? (
          <p className="mt-1 text-pretty text-sm font-medium text-foreground/80">{meta}</p>
        ) : null}
      </div>
      {action ? (
        <div className="flex w-full min-w-0 shrink-0 sm:w-auto sm:justify-end">{action}</div>
      ) : null}
    </div>
  )
}

