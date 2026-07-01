import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const DEFAULT_PAGE_SIZE = 20

interface DataTablePaginationProps {
  page: number
  pageSize?: number
  totalCount: number
  hasPrevious: boolean
  hasNext: boolean
  onPrevious: () => void
  onNext: () => void
  itemLabel?: string
  className?: string
}

export function getPaginationMeta(page: number, totalCount: number, pageSize = DEFAULT_PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const safePage = Math.min(Math.max(page, 1), totalPages)
  const start = totalCount === 0 ? 0 : (safePage - 1) * pageSize + 1
  const end = Math.min(safePage * pageSize, totalCount)
  return { totalPages, start, end, pageSize }
}

export function DataTablePagination({
  page,
  pageSize = DEFAULT_PAGE_SIZE,
  totalCount,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  itemLabel = 'items',
  className,
}: DataTablePaginationProps) {
  const { totalPages, start, end } = getPaginationMeta(page, totalCount, pageSize)

  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="text-sm text-muted-foreground">
        {totalCount === 0 ? (
          <>No {itemLabel}</>
        ) : (
          <>
            Showing{' '}
            <span className="font-medium text-foreground tabular-nums">
              {start}–{end}
            </span>{' '}
            of{' '}
            <span className="font-medium text-foreground tabular-nums">{totalCount}</span> {itemLabel}
            <span className="hidden sm:inline">
              {' '}
              · Page{' '}
              <span className="font-medium text-foreground tabular-nums">{page}</span> of{' '}
              <span className="font-medium text-foreground tabular-nums">{totalPages}</span>
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground sm:hidden tabular-nums">
          Page {page} / {totalPages}
        </span>
        <Button variant="outline" size="sm" disabled={!hasPrevious} onClick={onPrevious}>
          Previous
        </Button>
        <Button variant="outline" size="sm" disabled={!hasNext} onClick={onNext}>
          Next
        </Button>
      </div>
    </div>
  )
}

export { DEFAULT_PAGE_SIZE }
