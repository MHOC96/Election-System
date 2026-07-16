import type { LucideIcon } from 'lucide-react'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PageNoticeProps {
  icon?: LucideIcon
  children: React.ReactNode
  className?: string
  variant?: 'warning' | 'info'
}

export function PageNotice({
  icon: Icon = AlertTriangle,
  children,
  className,
  variant = 'warning',
}: PageNoticeProps) {
  return (
    <div
      role="status"
      className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3',
        variant === 'warning' && 'border-warning/25 bg-warning/5',
        variant === 'info' && 'border-border/70 bg-muted/30',
        className,
      )}
    >
      <Icon
        className={cn(
          'mt-0.5 h-4 w-4 shrink-0',
          variant === 'warning' ? 'text-warning' : 'text-muted-foreground',
        )}
        aria-hidden="true"
      />
      <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>
    </div>
  )
}
