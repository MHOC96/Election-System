import { memo } from 'react'
import type { LucideIcon } from 'lucide-react'
import { MicroSparkline } from '@/components/dashboard/MicroSparkline'
import { adminKpiTileShellClass, transitionInteractive } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

type KpiTone = 'primary' | 'success' | 'warning' | 'neutral'

interface KpiTileProps {
  label: string
  value: string | number
  meta?: string
  metaTone?: KpiTone
  progress?: number
  progressLabel?: string
  sparklineData?: number[]
  sparklineLabel?: string
  icon?: LucideIcon
  tone?: KpiTone
  className?: string
}

const toneStyles: Record<
  KpiTone,
  { icon: string; spark: string; progress: string; meta: string }
> = {
  primary: {
    icon: 'bg-primary/12 text-primary ring-primary/20 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.45)] dark:bg-primary/20 dark:ring-primary/30',
    spark: 'stroke-primary text-primary',
    progress: 'bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.28)] dark:shadow-[0_0_12px_hsl(var(--primary)/0.45)]',
    meta: 'text-muted-foreground dark:text-muted-foreground/90',
  },
  success: {
    icon: 'bg-success/12 text-success ring-success/20 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.45)] dark:bg-success/20 dark:ring-success/30',
    spark: 'stroke-success text-success',
    progress: 'bg-success shadow-[0_0_10px_hsl(var(--success)/0.22)] dark:shadow-[0_0_12px_hsl(var(--success)/0.4)]',
    meta: 'text-success/90 dark:text-success/85',
  },
  warning: {
    icon: 'bg-warning/12 text-warning ring-warning/20 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.45)] dark:bg-warning/20 dark:ring-warning/30',
    spark: 'stroke-warning text-warning',
    progress: 'bg-warning shadow-[0_0_10px_hsl(var(--warning)/0.2)] dark:shadow-[0_0_12px_hsl(var(--warning)/0.35)]',
    meta: 'text-warning/90 dark:text-warning/85',
  },
  neutral: {
    icon: 'bg-muted/80 text-foreground/75 ring-border/70 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.55)] dark:bg-muted/50 dark:text-foreground/80 dark:ring-border/70',
    spark: 'stroke-foreground/50 text-foreground',
    progress: 'bg-foreground/60 dark:bg-foreground/50',
    meta: 'text-muted-foreground dark:text-muted-foreground/90',
  },
}

export const KpiTile = memo(function KpiTile({
  label,
  value,
  meta,
  metaTone = 'neutral',
  progress,
  progressLabel,
  sparklineData,
  sparklineLabel,
  icon: Icon,
  tone = 'primary',
  className,
}: KpiTileProps) {
  const styles = toneStyles[tone]
  const clampedProgress =
    progress !== undefined ? Math.min(100, Math.max(0, progress)) : undefined

  return (
    <div className={cn(adminKpiTileShellClass, transitionInteractive, 'group', className)}>
      <div className="admin-kpi-inner relative flex h-full min-h-[7.5rem] flex-col overflow-hidden rounded-[calc(1rem-0.3rem)] bg-card px-3.5 py-3 sm:min-h-[8rem] sm:px-4 sm:py-3.5">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-12 h-24 w-24 rounded-full bg-primary/[0.06] blur-2xl transition-opacity duration-500 group-hover:bg-primary/[0.1] dark:bg-primary/[0.12] dark:group-hover:bg-primary/[0.18]"
        />

        <div className="flex items-start justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </p>
          {Icon ? (
            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset',
                styles.icon,
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          ) : null}
        </div>

        <div className="mt-2 flex items-end justify-between gap-3">
          <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground sm:text-[1.65rem]">
            {value}
          </p>
          {sparklineData && sparklineData.length > 0 ? (
            <MicroSparkline
              data={sparklineData}
              className={styles.spark}
              strokeClassName={tone === 'success' ? 'stroke-success' : tone === 'warning' ? 'stroke-warning' : tone === 'neutral' ? 'stroke-foreground/50' : 'stroke-primary'}
              ariaLabel={sparklineLabel}
            />
          ) : null}
        </div>

        {clampedProgress !== undefined ? (
          <div className="mt-3 space-y-1.5">
            <div className="h-1 overflow-hidden rounded-full bg-muted/90 ring-1 ring-inset ring-border/40 dark:bg-muted/35 dark:ring-border/50">
              <div
                className={cn('h-full rounded-full transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]', styles.progress)}
                style={{ width: `${clampedProgress}%` }}
                role="progressbar"
                aria-valuenow={clampedProgress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={progressLabel ?? label}
              />
            </div>
            {progressLabel ? (
              <p className="text-[11px] font-medium tabular-nums text-muted-foreground">
                {progressLabel}
              </p>
            ) : null}
          </div>
        ) : null}

        {meta ? (
          <p
            className={cn(
              'mt-auto pt-2 text-[11px] leading-snug',
              toneStyles[metaTone].meta,
            )}
          >
            {meta}
          </p>
        ) : null}
      </div>
    </div>
  )
})
