import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface ChartSkeletonProps {
  className?: string
  variant?: 'bar' | 'donut'
}

export function ChartSkeleton({ className, variant = 'bar' }: ChartSkeletonProps) {
  return (
    <div
      className={cn('flex h-full w-full items-center justify-center', className)}
      role="status"
      aria-label="Loading chart"
    >
      {variant === 'donut' ? (
        <div className="relative flex h-48 w-48 items-center justify-center">
          <Skeleton className="h-full w-full rounded-full" />
          <Skeleton className="absolute h-24 w-24 rounded-full bg-background" />
        </div>
      ) : (
        <div className="flex h-full w-full items-end justify-center gap-3 px-4 pb-6 pt-8">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              key={index}
              className="w-full max-w-12 rounded-t-md"
              style={{ height: `${40 + index * 12}%` }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
