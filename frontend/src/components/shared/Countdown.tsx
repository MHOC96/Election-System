import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Clock } from 'lucide-react'

interface CountdownProps {
  targetDate: string
  label?: string
}

export function Countdown({ targetDate, label = 'Starts in' }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
  } | null>(null)

  useEffect(() => {
    const target = new Date(targetDate).getTime()

    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      const difference = target - now

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        })
      } else {
        setTimeLeft(null)
      }
    }

    calculateTimeLeft()
    const intervalId = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(intervalId)
  }, [targetDate])

  if (!timeLeft) {
    return null
  }

  return (
    <Card className="overflow-hidden border-border/70 shadow-sm relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-primary/60" />
      <CardContent className="p-6 flex flex-col items-center justify-center">
        <div className="flex items-center gap-2 text-primary font-medium mb-4">
          <Clock className="w-5 h-5 animate-pulse" />
          <p>{label}</p>
        </div>
        <div className="grid grid-cols-4 gap-3 text-center w-full max-w-sm">
          <div className="portal-digit flex flex-col items-center justify-center rounded-xl px-2 py-3">
            <span className="portal-digit__value text-2xl font-bold leading-none">{timeLeft.days}</span>
            <span className="portal-digit__label mt-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]">Days</span>
          </div>
          <div className="portal-digit flex flex-col items-center justify-center rounded-xl px-2 py-3">
            <span className="portal-digit__value text-2xl font-bold leading-none">{timeLeft.hours}</span>
            <span className="portal-digit__label mt-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]">Hrs</span>
          </div>
          <div className="portal-digit flex flex-col items-center justify-center rounded-xl px-2 py-3">
            <span className="portal-digit__value text-2xl font-bold leading-none">{timeLeft.minutes}</span>
            <span className="portal-digit__label mt-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]">Mins</span>
          </div>
          <div className="portal-digit portal-digit--pulse flex flex-col items-center justify-center rounded-xl px-2 py-3">
            <span className="portal-digit__value text-2xl font-bold leading-none">{timeLeft.seconds}</span>
            <span className="portal-digit__label mt-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]">Secs</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
