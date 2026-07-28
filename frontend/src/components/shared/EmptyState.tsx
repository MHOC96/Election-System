import type { ReactNode } from 'react'
import { type LucideIcon, Inbox } from 'lucide-react'
import { iconTileClass, memberEmptyStateClass } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  className?: string
  children?: ReactNode
  /** Kept for compatibility — member and admin now share the same surface. */
  variant?: 'default' | 'member'
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  className,
  children,
  variant = 'default',
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'animate-fade-in',
        variant === 'member' ? memberEmptyStateClass : 'bg-grid flex w-full flex-col items-center justify-center rounded-xl border border-dashed bg-card/40 p-8 text-center sm:p-12',
        className,
      )}
    >
      <div className={cn(iconTileClass, 'mb-5 h-16 w-16')}>
        <Icon className="h-7 w-7" aria-hidden="true" />
      </div>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
      {children ? <div className="mt-6">{children}</div> : null}
    </div>
  )
}
