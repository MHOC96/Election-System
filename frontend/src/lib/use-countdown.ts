import { useEffect, useState } from 'react'

export function useCountdown(targetIso: string | null | undefined): number | null {
  const [remainingMs, setRemainingMs] = useState<number | null>(null)

  useEffect(() => {
    if (!targetIso) {
      setRemainingMs(null)
      return
    }

    const targetMs = new Date(targetIso).getTime()
    if (Number.isNaN(targetMs)) {
      setRemainingMs(null)
      return
    }

    const tick = () => {
      const diff = targetMs - Date.now()
      setRemainingMs(diff > 0 ? diff : 0)
    }

    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [targetIso])

  return remainingMs
}
