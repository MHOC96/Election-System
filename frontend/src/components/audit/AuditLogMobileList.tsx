import type { AuditLog } from '@/types/api'
import { AuditActionBadge } from '@/components/shared/StatusBadge'
import { cn, formatDate } from '@/lib/utils'

interface AuditLogMobileListProps {
  logs: AuditLog[]
  onSelectLog?: (logId: number) => void
}

export function AuditLogMobileList({ logs, onSelectLog }: AuditLogMobileListProps) {
  return (
    <ul className="divide-y">
      {logs.map((log) => (
        <li key={log.id}>
          <button
            type="button"
            className={cn(
              'w-full space-y-2 p-4 text-left transition-colors',
              onSelectLog && 'hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
            onClick={() => onSelectLog?.(log.id)}
            disabled={!onSelectLog}
          >
            <div className="flex items-start justify-between gap-3">
              <AuditActionBadge action={log.action} />
              <time className="shrink-0 text-xs text-muted-foreground" dateTime={log.created_at}>
                {formatDate(log.created_at)}
              </time>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Actor</dt>
              <dd className="font-medium">{log.actor_cpm_number ?? '—'}</dd>
              <dt className="text-muted-foreground">IP</dt>
              <dd className="text-muted-foreground">{log.ip_address ?? '—'}</dd>
            </dl>
          </button>
        </li>
      ))}
    </ul>
  )
}
