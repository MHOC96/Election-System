import { memo } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { iconTileClass, transitionInteractive } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon?: LucideIcon
  className?: string
}

export const StatCard = memo(function StatCard({
  title,
  value,
  description,
  icon: Icon,
  className,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        'group relative flex h-full flex-col overflow-hidden',
        transitionInteractive,
        'hover:-translate-y-0.5 hover:border-border hover:shadow-md',
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-primary/[0.05] blur-2xl transition-opacity duration-200 group-hover:bg-primary/[0.08] dark:bg-primary/[0.08] dark:group-hover:bg-primary/[0.12]"
      />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {Icon ? (
          <span className={iconTileClass}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        ) : null}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl">{value}</div>
        {description ? <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{description}</p> : null}
      </CardContent>
    </Card>
  )
})
