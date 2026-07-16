import { Input } from '@/components/ui/input'
import { joinLocalDateTime, splitLocalDateTime } from '@/lib/datetime'
import { cn } from '@/lib/utils'

interface DateTimeSplitInputProps {
  id: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  disabled?: boolean
  className?: string
}

export function DateTimeSplitInput({
  id,
  value,
  onChange,
  onBlur,
  disabled,
  className,
}: DateTimeSplitInputProps) {
  const { date, time } = splitLocalDateTime(value)

  return (
    <div className={cn('grid grid-cols-1 gap-2 sm:grid-cols-2', className)}>
      <Input
        id={`${id}-date`}
        type="date"
        value={date}
        disabled={disabled}
        onBlur={onBlur}
        onChange={(event) => onChange(joinLocalDateTime(event.target.value, time))}
      />
      <Input
        id={`${id}-time`}
        type="time"
        value={time}
        disabled={disabled}
        onBlur={onBlur}
        onChange={(event) => onChange(joinLocalDateTime(date, event.target.value))}
      />
    </div>
  )
}
