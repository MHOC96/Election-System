import type { ReactNode } from 'react'
import { type LucideIcon, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  className?: string
  children?: ReactNode
  /** `member` uses the portal surface tokens and inherits the phase accent. */
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
  const isMember = variant === 'member'

  return (
    <div
      className={cn(
        'flex animate-fade-in flex-col items-center justify-center p-8 text-center sm:p-12',
        isMember
          ? 'portal-surface rounded-2xl'
          : 'bg-grid rounded-xl border border-dashed bg-card/40',
        className,
      )}
    >
      <div
        className={cn(
          'mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border',
          isMember
            ? 'portal-accent-soft portal-accent-text portal-accent-border'
            : 'border-primary/15 bg-primary/10 text-primary',
        )}
      >
        <Icon className="h-7 w-7" aria-hidden="true" />
      </div>
      <h2
        className={cn(
          'text-lg font-semibold tracking-tight',
          isMember && 'portal-heading sm:text-xl',
        )}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={cn(
            'mt-2 max-w-sm text-sm leading-relaxed',
            isMember ? 'portal-subtle' : 'text-muted-foreground',
          )}
        >
          {description}
        </p>
      ) : null}
      {children ? <div className="mt-6">{children}</div> : null}
    </div>
  )
}
