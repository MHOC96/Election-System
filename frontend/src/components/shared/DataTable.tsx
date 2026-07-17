import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { DataTablePagination, DEFAULT_PAGE_SIZE } from '@/components/shared/DataTablePagination'
import { responsiveTableDesktopClass, responsiveTableMobileClass, dataTableShellClass, dataTableScrollClass } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

interface DataTablePaginationConfig {
  page: number
  pageSize?: number
  totalCount: number
  hasPrevious: boolean
  hasNext: boolean
  onPrevious: () => void
  onNext: () => void
  itemLabel?: string
}

interface DataTableProps {
  isLoading?: boolean
  isRefreshing?: boolean
  isEmpty?: boolean
  emptyIcon?: LucideIcon
  emptyTitle?: string
  emptyDescription?: string
  skeletonRows?: number
  pagination?: DataTablePaginationConfig
  mobileView?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function DataTable({
  isLoading,
  isRefreshing,
  isEmpty,
  emptyIcon,
  emptyTitle = 'No data',
  emptyDescription,
  skeletonRows = 5,
  pagination,
  mobileView,
  children,
  className,
}: DataTableProps) {
  return (
    <Card className={cn(dataTableShellClass, className)}>
      <CardContent className="px-4 py-0 sm:px-6">
        {isLoading ? (
          <div className="divide-y">
            <div className="flex items-center gap-4 border-b border-border/60 bg-muted/40 px-0 py-3">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="ml-auto h-3.5 w-16" />
            </div>
            {Array.from({ length: skeletonRows }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-0 py-3.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="ml-auto h-8 w-8 rounded-lg" />
              </div>
            ))}
          </div>
        ) : isEmpty ? (
          <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
        ) : (
          <>
            {mobileView ? <div className={responsiveTableMobileClass}>{mobileView}</div> : null}
            <div
              className={cn(
                dataTableScrollClass,
                'relative transition-opacity duration-150',
                mobileView && responsiveTableDesktopClass,
                isRefreshing && 'opacity-60',
              )}
              aria-busy={isRefreshing}
            >
              {children}
            </div>
            {pagination ? (
              <DataTablePagination
                page={pagination.page}
                pageSize={pagination.pageSize ?? DEFAULT_PAGE_SIZE}
                totalCount={pagination.totalCount}
                hasPrevious={pagination.hasPrevious}
                hasNext={pagination.hasNext}
                onPrevious={pagination.onPrevious}
                onNext={pagination.onNext}
                itemLabel={pagination.itemLabel}
              />
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
