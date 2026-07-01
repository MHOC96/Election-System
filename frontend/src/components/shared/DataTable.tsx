import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { DataTablePagination, DEFAULT_PAGE_SIZE } from '@/components/shared/DataTablePagination'
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
    <Card className={className}>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-2 p-6">
            {Array.from({ length: skeletonRows }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : isEmpty ? (
          <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
        ) : (
          <>
            {mobileView ? <div className="md:hidden">{mobileView}</div> : null}
            <div className={cn(mobileView && 'hidden md:block')}>{children}</div>
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
