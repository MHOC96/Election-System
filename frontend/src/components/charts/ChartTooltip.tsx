import { cn } from '@/lib/utils'

type ChartTooltipPayload = {
  name?: string
  value?: number | string
  color?: string
  payload?: Record<string, unknown>
}

type ChartTooltipProps = {
  active?: boolean
  payload?: ChartTooltipPayload[]
  label?: string | number
  formatter?: (value: number, name: string, item: ChartTooltipPayload) => React.ReactNode
  labelFormatter?: (label: string) => React.ReactNode
}

export function ChartTooltip({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow-md">
      {label != null && label !== '' ? (
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">
          {labelFormatter ? labelFormatter(String(label)) : label}
        </p>
      ) : null}
      <div className="space-y-1">
        {payload.map((entry, index) => {
          const rawValue = entry.value
          const numValue = typeof rawValue === 'number' ? rawValue : Number(rawValue ?? 0)
          const name = String(entry.name ?? '')
          const content = formatter
            ? formatter(numValue, name, entry)
            : `${numValue.toLocaleString()} ${name}`

          return (
            <div key={`${name}-${index}`} className="flex items-center gap-2 text-sm">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color ?? 'hsl(var(--primary))' }}
                aria-hidden="true"
              />
              <span className={cn('font-medium tabular-nums')}>{content}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
