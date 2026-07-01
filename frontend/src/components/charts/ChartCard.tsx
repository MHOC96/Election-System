import type { ReactNode } from 'react'
import { BarChart3 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils'

interface ChartCardProps {
  title: string
  description?: string
  summary?: string
  isEmpty?: boolean
  emptyTitle?: string
  emptyDescription?: string
  children: ReactNode
  className?: string
  contentClassName?: string
}

export function ChartCard({
  title,
  description,
  summary,
  isEmpty,
  emptyTitle = 'No data yet',
  emptyDescription,
  children,
  className,
  contentClassName,
}: ChartCardProps) {
  return (
    <Card className={cn('overflow-hidden border shadow-sm', className)}>
      <CardHeader className="border-b bg-muted/20 pb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <BarChart3 className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-base">{title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn('pt-6', contentClassName)}>
        {summary ? (
          <p className="sr-only" aria-live="polite">
            {summary}
          </p>
        ) : null}
        {isEmpty ? (
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
            className="border-none p-8"
          />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}
