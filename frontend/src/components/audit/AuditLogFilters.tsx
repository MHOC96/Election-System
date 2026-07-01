import { Filter, X } from 'lucide-react'
import { AUDIT_ACTIONS } from '@/lib/audit-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface AuditLogFilterValues {
  action: string
  actorCpm: string
  fromDate: string
  toDate: string
}

interface AuditLogFiltersProps {
  values: AuditLogFilterValues
  onChange: (values: AuditLogFilterValues) => void
}

const EMPTY_FILTERS: AuditLogFilterValues = {
  action: '',
  actorCpm: '',
  fromDate: '',
  toDate: '',
}

export function AuditLogFilters({ values, onChange }: AuditLogFiltersProps) {
  const hasFilters =
    values.action !== '' ||
    values.actorCpm.trim() !== '' ||
    values.fromDate !== '' ||
    values.toDate !== ''

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Filter className="h-4 w-4 text-muted-foreground" aria-hidden />
          Filters
        </div>
        {hasFilters ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-muted-foreground"
            onClick={() => onChange(EMPTY_FILTERS)}
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Clear
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="audit-filter-action">Action</Label>
          <Select
            value={values.action || 'all'}
            onValueChange={(value) =>
              onChange({ ...values, action: value === 'all' ? '' : value })
            }
          >
            <SelectTrigger id="audit-filter-action" aria-label="Filter by action">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {AUDIT_ACTIONS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="audit-filter-actor">Actor CPM</Label>
          <Input
            id="audit-filter-actor"
            placeholder="e.g. CPM12345"
            value={values.actorCpm}
            onChange={(e) => onChange({ ...values, actorCpm: e.target.value })}
            autoComplete="off"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="audit-filter-from">From date</Label>
          <Input
            id="audit-filter-from"
            type="date"
            value={values.fromDate}
            onChange={(e) => onChange({ ...values, fromDate: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="audit-filter-to">To date</Label>
          <Input
            id="audit-filter-to"
            type="date"
            value={values.toDate}
            min={values.fromDate || undefined}
            onChange={(e) => onChange({ ...values, toDate: e.target.value })}
          />
        </div>
      </div>
    </div>
  )
}
