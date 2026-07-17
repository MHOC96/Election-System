import { Calendar, Clock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { TimeClockPicker } from '@/components/design-system/TimeClockPicker'
import {
  buildLocalDateTime,
  formatLocalDateTimePreview,
  parseLocalDateTimeParts,
} from '@/lib/datetime'
import { cn } from '@/lib/utils'

interface DateTimeFieldProps {
  id: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  disabled?: boolean
  className?: string
  minDate?: string
  'aria-invalid'?: boolean
}

export function DateTimeField({
  id,
  value,
  onChange,
  onBlur,
  disabled,
  className,
  minDate,
  'aria-invalid': ariaInvalid,
}: DateTimeFieldProps) {
  const parts = parseLocalDateTimeParts(value)
  const preview = formatLocalDateTimePreview(value)
  const timeDisabled = disabled || !parts.date

  const update = (next: Partial<typeof parts>) => {
    onChange(buildLocalDateTime({ ...parts, ...next }))
  }

  return (
    <div
      className={cn(
        'space-y-3 rounded-xl border border-border/80 bg-muted/15 p-3 shadow-xs dark:bg-muted/20',
        ariaInvalid && 'border-destructive/60',
        className,
      )}
      data-invalid={ariaInvalid ? true : undefined}
    >
      <div className="space-y-1.5">
        <label htmlFor={`${id}-date`} className="text-xs font-medium text-muted-foreground">
          Date
        </label>
        <div className="relative">
          <Calendar
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id={`${id}-date`}
            type="date"
            value={parts.date}
            min={minDate}
            disabled={disabled}
            onBlur={onBlur}
            className="pl-10"
            aria-invalid={ariaInvalid}
            onChange={(event) => update({ date: event.target.value })}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor={`${id}-time`} className="text-xs font-medium text-muted-foreground">
          Time
        </label>
        <TimeClockPicker
          id={`${id}-time`}
          value={parts}
          disabled={timeDisabled}
          aria-invalid={ariaInvalid}
          onBlur={onBlur}
          onChange={(patch) => update(patch)}
        />
        <p className="text-[11px] text-muted-foreground">
          Tap the time to open the clock and pick hour and minute.
        </p>
      </div>

      {preview ? (
        <p className="flex items-start gap-1.5 rounded-lg bg-background/80 px-2.5 py-2 text-xs text-muted-foreground">
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-medium text-foreground">Scheduled: </span>
            {preview}
          </span>
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Choose a date and time to schedule this event.</p>
      )}
    </div>
  )
}

/** @deprecated Use DateTimeField */
export const DateTimeSplitInput = DateTimeField
