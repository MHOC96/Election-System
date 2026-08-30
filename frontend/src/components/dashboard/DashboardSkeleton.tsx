import { Skeleton } from '@/components/ui/skeleton'
import { adminKpiGridClass, adminKpiTileShellClass, contentGridClass, pageLayoutClass } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

export function DashboardSkeleton() {
  return (
    <div className={pageLayoutClass}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-full max-w-xs rounded-xl sm:w-52" />
      </div>
      <div className={adminKpiGridClass}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={cn(adminKpiTileShellClass, 'p-[3px]')}>
            <Skeleton className="h-[8rem] rounded-[calc(1rem-0.3rem)]" />
          </div>
        ))}
      </div>
      <div className={contentGridClass}>
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  )
}
