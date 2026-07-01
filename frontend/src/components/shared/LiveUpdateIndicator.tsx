import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface LiveUpdateIndicatorProps {
  isActive?: boolean
  updatedAt?: number
  pollIntervalSeconds?: number
  className?: string
}

function formatRelativeTime(timestamp: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000))
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

export function LiveUpdateIndicator({
  isActive,
  updatedAt,
  pollIntervalSeconds,
  className,
}: LiveUpdateIndicatorProps) {
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!updatedAt) return
    const id = window.setInterval(() => setTick((t) => t + 1), 1000)
    return () => window.clearInterval(id)
  }, [updatedAt])

  if (!updatedAt) return null

  return (
    <div
      className={cn('flex items-center gap-2 text-xs text-muted-foreground', className)}
      role="status"
      aria-live="polite"
    >
      {isActive ? (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
        </span>
      ) : (
        <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
      )}
      <span>
        Updated {formatRelativeTime(updatedAt)}
        {pollIntervalSeconds && isActive ? ` · refreshes every ${pollIntervalSeconds}s` : ''}
      </span>
    </div>
  )
}
