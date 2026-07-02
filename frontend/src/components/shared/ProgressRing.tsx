import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface ProgressRingProps {
  /** 0–100 */
  value: number
  size?: number
  strokeWidth?: number
  className?: string
  /** Center content override; defaults to rounded percentage */
  label?: React.ReactNode
  sublabel?: React.ReactNode
  ariaLabel?: string
}

export function ProgressRing({
  value,
  size = 72,
  strokeWidth = 7,
  className,
  label,
  sublabel,
  ariaLabel,
}: ProgressRingProps) {
  const clamped = Math.min(Math.max(value, 0), 100)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  // Animate from 0 to value on mount for a premium reveal.
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setDisplay(clamped))
    return () => cancelAnimationFrame(frame)
  }, [clamped])

  const offset = circumference - (display / 100) * circumference

  return (
    <div
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={ariaLabel ?? `${Math.round(clamped)} percent`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          stroke="hsl(var(--primary))"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-sm font-semibold tabular-nums">
          {label ?? `${Math.round(clamped)}%`}
        </span>
        {sublabel ? (
          <span className="mt-0.5 text-[10px] text-muted-foreground">{sublabel}</span>
        ) : null}
      </div>
    </div>
  )
}
