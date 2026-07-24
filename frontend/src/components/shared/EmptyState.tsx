import type { ReactNode } from 'react'
import { type LucideIcon, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  className?: string
  children?: ReactNode
  /** Member portal surfaces use the shared countdown gradient system */
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
        'flex animate-fade-in flex-col items-center justify-center rounded-xl p-8 text-center sm:p-12',
        variant === 'default' &&
          'bg-grid border border-dashed bg-card/40',
        variant === 'member' && 'member-surface member-surface--inset',
        className,
      )}
    >
      <div
        className={cn(
          'mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ring-1 ring-inset',
          variant === 'member'
            ? 'border border-[var(--cd-chip-border)] bg-[var(--cd-chip-bg)] text-[var(--cd-chip-text)]'
            : 'bg-gradient-to-br from-primary/12 to-primary/5 text-primary ring-primary/15',
        )}
      >
        <Icon className="h-7 w-7" aria-hidden="true" />
      </div>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {description && <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {children && <div className="mt-6">{children}</div>}
    </div>
  )
}
