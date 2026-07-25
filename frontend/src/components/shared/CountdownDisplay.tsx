import { memo, useEffect, useRef } from 'react'
import { splitCountdown } from '@/lib/datetime'
import { useCountdown } from '@/lib/use-countdown'
import { cn } from '@/lib/utils'

function TimeUnit({ value, label, pulse }: { value: number; label: string; pulse?: boolean }) {
  return (
    <div
      className={cn(
        'portal-digit flex w-full min-w-0 flex-col items-center justify-center rounded-xl px-2 py-3 sm:px-3 sm:py-4',
        pulse && 'portal-digit--pulse',
      )}
    >
      <span className="portal-digit__value text-[1.75rem] font-bold leading-none tracking-tight sm:text-4xl">
        {String(value).padStart(2, '0')}
      </span>
      <span className="portal-digit__label mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] sm:text-xs">
        {label}
      </span>
    </div>
  )
}

const CountdownDigits = memo(function CountdownDigits({
  targetAt,
  centered,
}: {
  targetAt: string
  centered?: boolean
}) {
  const countdownMs = useCountdown(targetAt)
  const parts =
    countdownMs !== null ? splitCountdown(countdownMs) : { days: 0, hours: 0, minutes: 0, seconds: 0 }
  const showDays = parts.days > 0

  if (countdownMs === null) return null

  return (
    <div
      className={cn(
        'grid w-full gap-2 sm:gap-3',
        centered && 'mx-auto max-w-xl',
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
  const onExpireRef = useRef(onExpire)
  const firedTargetsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  useEffect(() => {
    if (!targetAt || countdownMs === null) return

    if (countdownMs > 0) {
      firedTargetsRef.current.delete(targetAt)
      return
    }

    if (firedTargetsRef.current.has(targetAt)) return

    firedTargetsRef.current.add(targetAt)
    queueMicrotask(() => {
      onExpireRef.current?.()
    })
  }, [countdownMs, targetAt])

  return null
}

export function CountdownDisplay({
  targetAt,
  label,
  centered = false,
  className,
}: {
  targetAt: string | null
  label: string
  centered?: boolean
  className?: string
}) {
  if (!targetAt) return null

  return (
    <div
      className={cn(
        'w-full space-y-3',
        centered && 'mx-auto max-w-xl text-center',
        className,
      )}
      aria-live="polite"
      aria-label={label}
    >
      <p className="portal-accent-text text-xs font-semibold uppercase tracking-[0.14em] sm:text-sm">
        {label}
      </p>
      <CountdownDigits targetAt={targetAt} centered={centered} />
    </div>
  )
}
