import { useQuery } from '@tanstack/react-query'
import { fetchAuditLog } from '@/api/audit'
import { AuditActionBadge } from '@/components/shared/StatusBadge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { formatDate } from '@/lib/utils'

interface AuditLogDetailSheetProps {
  logId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AuditLogDetailSheet({ logId, open, onOpenChange }: AuditLogDetailSheetProps) {
  const { data: log, isLoading, isError } = useQuery({
    queryKey: ['audit-log', logId],
    queryFn: () => fetchAuditLog(logId!),
    enabled: open && logId != null,
  })

  const metadataJson =
    log?.metadata && Object.keys(log.metadata).length > 0
      ? JSON.stringify(log.metadata, null, 2)
      : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Audit log detail</SheetTitle>
          <SheetDescription>
            {logId != null ? `Log #${logId}` : 'Loading audit record…'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : isError || !log ? (
            <p className="text-sm text-destructive" role="alert">
              Unable to load audit log details. Please try again.
            </p>
          ) : (
            <>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
                <dt className="text-muted-foreground">Time</dt>
                <dd>
                  <time dateTime={log.created_at}>{formatDate(log.created_at)}</time>
                </dd>

                <dt className="text-muted-foreground">Action</dt>
                <dd>
                  <AuditActionBadge action={log.action} />
                </dd>

                <dt className="text-muted-foreground">Actor</dt>
                <dd className="font-medium">{log.actor_cpm_number ?? '—'}</dd>

                <dt className="text-muted-foreground">IP address</dt>
                <dd className="font-mono text-muted-foreground">{log.ip_address ?? '—'}</dd>
              </dl>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Metadata</h3>
                {metadataJson ? (
                  <pre className="max-h-80 overflow-auto rounded-md border bg-muted/40 p-4 font-mono text-xs leading-relaxed">
                    {metadataJson}
                  </pre>
                ) : (
                  <p className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                    No metadata recorded for this action.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
