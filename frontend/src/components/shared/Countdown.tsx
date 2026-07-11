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
    <Card className="bg-primary/5 border-primary/20 shadow-sm overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/50" />
      <CardContent className="p-6 flex flex-col items-center justify-center">
        <div className="flex items-center gap-2 text-primary font-medium mb-4">
          <Clock className="w-5 h-5 animate-pulse" />
          <p>{label}</p>
        </div>
        <div className="grid grid-cols-4 gap-4 text-center w-full max-w-sm">
          <div className="flex flex-col bg-background rounded-lg border shadow-sm p-2">
            <span className="text-2xl font-bold text-foreground">{timeLeft.days}</span>
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Days</span>
          </div>
          <div className="flex flex-col bg-background rounded-lg border shadow-sm p-2">
            <span className="text-2xl font-bold text-foreground">{timeLeft.hours}</span>
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Hrs</span>
          </div>
          <div className="flex flex-col bg-background rounded-lg border shadow-sm p-2">
            <span className="text-2xl font-bold text-foreground">{timeLeft.minutes}</span>
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Mins</span>
          </div>
          <div className="flex flex-col bg-background rounded-lg border shadow-sm p-2">
            <span className="text-2xl font-bold text-foreground">{timeLeft.seconds}</span>
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Secs</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
