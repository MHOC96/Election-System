import { memo, useEffect, useRef } from 'react'
import { splitCountdown } from '@/lib/datetime'
import { useCountdown } from '@/lib/use-countdown'
import { cn } from '@/lib/utils'

function TimeUnit({
  value,
  label,
  pulse,
}: {
  value: number
  label: string
  pulse?: boolean
}) {
  return (
    <div
      className={cn(
        'election-countdown__digit flex w-full min-w-0 flex-col items-center justify-center rounded-xl px-2 py-2.5 sm:rounded-2xl sm:px-3 sm:py-3.5 md:px-4 md:py-4',
        pulse && 'election-countdown__digit--seconds',
      )}
    >
      <span className="election-countdown__digit-value text-2xl font-bold leading-none tabular-nums tracking-tight sm:text-3xl md:text-4xl">
        {String(value).padStart(2, '0')}
      </span>
      <span
        className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] sm:mt-2 sm:text-xs sm:tracking-[0.2em]"
        style={{ color: 'var(--cd-label)' }}
      >
        {label}
      </span>
    </div>
  )
}

const CountdownDigits = memo(function CountdownDigits({ targetAt }: { targetAt: string }) {
  const countdownMs = useCountdown(targetAt)
  const parts =
    countdownMs !== null ? splitCountdown(countdownMs) : { days: 0, hours: 0, minutes: 0, seconds: 0 }
  const showDays = parts.days > 0

  if (countdownMs === null) return null

  return (
    <div
      className={cn(
        'grid w-full gap-2 sm:gap-3',
        showDays ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3',
      )}
    >
      {showDays ? <TimeUnit value={parts.days} label="Days" /> : null}
      <TimeUnit value={parts.hours} label="Hours" />
      <TimeUnit value={parts.minutes} label="Minutes" />
      <TimeUnit value={parts.seconds} label="Seconds" pulse />
    </div>
  )
})

export function CountdownExpiryWatcher({
  targetAt,
  onExpire,
}: {
  targetAt: string | null
  onExpire?: () => void
}) {
  const countdownMs = useCountdown(targetAt)
  const expiredRef = useRef(false)

  useEffect(() => {
    if (!targetAt || countdownMs === null) {
      expiredRef.current = false
      return
    }

    if (countdownMs === 0 && !expiredRef.current) {
      expiredRef.current = true
      onExpire?.()
      return
    }

    if (countdownMs > 0) {
      expiredRef.current = false
    }
  }, [countdownMs, targetAt, onExpire])

  return null
}

export function CountdownDisplay({
  targetAt,
  label,
}: {
  targetAt: string | null
  label: string
}) {
  if (!targetAt) return null

  return (
    <div className="space-y-2.5 sm:space-y-3">
      <p className="text-xs font-semibold tracking-wide sm:text-sm" style={{ color: 'var(--cd-digit-accent)' }}>
        {label}
      </p>
      <CountdownDigits targetAt={targetAt} />
    </div>
  )
}
