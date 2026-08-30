import { useId, useMemo } from 'react'
import { cn } from '@/lib/utils'

interface MicroSparklineProps {
  data: number[]
  className?: string
  strokeClassName?: string
  height?: number
  ariaLabel?: string
}

function buildSparklinePath(data: number[], width: number, height: number): string {
  if (data.length === 0) return ''
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const step = data.length > 1 ? width / (data.length - 1) : 0

  return data
    .map((value, index) => {
      const x = index * step
      const normalized = (value - min) / range
      const y = height - normalized * (height - 2) - 1
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
}

export function MicroSparkline({
  data,
  className,
  strokeClassName = 'stroke-primary',
  height = 28,
  ariaLabel,
}: MicroSparklineProps) {
  const gradientId = useId()
  const width = 72

  const path = useMemo(() => buildSparklinePath(data, width, height), [data, height])

  if (data.length < 2 || !path) {
    return (
      <div
        className={cn('flex items-end gap-0.5 opacity-40', className)}
        aria-hidden={!ariaLabel}
        role={ariaLabel ? 'img' : undefined}
        aria-label={ariaLabel}
      >
        {Array.from({ length: 5 }).map((_, index) => (
          <span
            key={index}
            className="w-1 rounded-full bg-muted-foreground/30"
            style={{ height: `${8 + (index % 3) * 4}px` }}
          />
        ))}
      </div>
    )
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('shrink-0 overflow-visible', className)}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      aria-hidden={!ariaLabel}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.32" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${path} L${width},${height} L0,${height} Z`}
        className="fill-primary/15"
        fill={`url(#${gradientId})`}
      />
      <path
        d={path}
        fill="none"
        className={cn(strokeClassName, 'stroke-[1.75]')}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
