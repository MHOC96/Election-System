import { useEffect, useState } from 'react'
import { Clock, Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  formatTimePartsDisplay,
  type LocalDateTimeParts,
  type TimePeriod,
} from '@/lib/datetime'
import { cn } from '@/lib/utils'

type ClockPhase = 'hour' | 'minute'

interface TimeClockPickerProps {
  id: string
  value: Pick<LocalDateTimeParts, 'hour12' | 'minute' | 'period'>
  onChange: (patch: Partial<LocalDateTimeParts>) => void
  onBlur?: () => void
  disabled?: boolean
  'aria-invalid'?: boolean
}

const HOUR_VALUES = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const
const MINUTE_STEP_VALUES = Array.from({ length: 12 }, (_, index) => index * 5)

function dialPosition(index: number, radiusPercent: number) {
  const angle = ((index * 30 - 90) * Math.PI) / 180
  return {
    left: `${50 + Math.cos(angle) * radiusPercent}%`,
    top: `${50 + Math.sin(angle) * radiusPercent}%`,
  }
}

function ClockDial({
  phase,
  hour12,
  minute,
  onHourSelect,
  onMinuteSelect,
}: {
  phase: ClockPhase
  hour12: number
  minute: number
  onHourSelect: (hour: number) => void
  onMinuteSelect: (minute: number) => void
}) {
  const minuteHandAngle = (minute / 60) * 360 - 90
  const hourHandAngle = ((hour12 % 12) / 12) * 360 + (minute / 60) * 30 - 90

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[17rem] sm:max-w-[18rem]">
      <div className="absolute inset-0 rounded-full border border-border/70 bg-gradient-to-br from-muted/25 via-card to-muted/40 shadow-inner dark:from-muted/30 dark:via-card dark:to-muted/50" />

      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[2px] w-[28%] origin-left -translate-y-1/2 rounded-full bg-foreground/80"
        style={{ transform: `translateY(-50%) rotate(${hourHandAngle}deg)` }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[2px] w-[38%] origin-left -translate-y-1/2 rounded-full bg-primary"
        style={{ transform: `translateY(-50%) rotate(${minuteHandAngle}deg)` }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-sm"
        aria-hidden="true"
      />

      {phase === 'hour'
        ? HOUR_VALUES.map((hour, index) => {
            const position = dialPosition(index, 36)
            const isSelected = hour12 === hour

            return (
              <button
                key={hour}
                type="button"
                className={cn(
                  'absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-sm font-semibold transition-colors',
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-foreground hover:bg-primary/10',
                )}
                style={position}
                onClick={() => onHourSelect(hour)}
              >
                {hour}
              </button>
            )
          })
        : MINUTE_STEP_VALUES.map((stepMinute, index) => {
            const position = dialPosition(index, 36)
            const isSelected = Math.floor(minute / 5) * 5 === stepMinute

            return (
              <button
                key={stepMinute}
                type="button"
                className={cn(
                  'absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-foreground hover:bg-primary/10',
                )}
                style={position}
                onClick={() => onMinuteSelect(stepMinute)}
              >
                {String(stepMinute).padStart(2, '0')}
              </button>
            )
          })}
    </div>
  )
}

export function TimeClockPicker({
  id,
  value,
  onChange,
  onBlur,
  disabled,
  'aria-invalid': ariaInvalid,
}: TimeClockPickerProps) {
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<ClockPhase>('hour')
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    if (!open) setDraft(value)
  }, [open, value])

  const displayValue = formatTimePartsDisplay(value)

  const applyDraft = () => {
    onChange(draft)
    onBlur?.()
    setOpen(false)
  }

  const adjustMinute = (delta: number) => {
    setDraft((current) => ({
      ...current,
      minute: (current.minute + delta + 60) % 60,
    }))
  }

  return (
    <>
      <Button
        id={id}
        type="button"
        variant="outline"
        disabled={disabled}
        aria-invalid={ariaInvalid}
        className={cn(
          'h-11 w-full justify-start gap-2 px-3 text-left font-normal md:h-10',
          ariaInvalid && 'border-destructive/60',
        )}
        onClick={() => {
          setPhase('hour')
          setDraft(value)
          setOpen(true)
        }}
      >
        <Clock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="truncate">{displayValue}</span>
        <span className="sr-only">Open clock to select time</span>
      </Button>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          if (!nextOpen) onBlur?.()
        }}
      >
        <DialogContent className="max-w-sm gap-0 p-0 sm:max-w-md">
          <DialogHeader className="border-b px-5 pb-4 pt-5 text-center sm:px-6">
            <DialogTitle>Select time</DialogTitle>
            <DialogDescription>
              {phase === 'hour' ? 'Choose the hour on the clock' : 'Choose the minute on the clock'}
            </DialogDescription>
            <p className="pt-2 text-3xl font-semibold tracking-tight text-foreground tabular-nums">
              {formatTimePartsDisplay(draft)}
            </p>
          </DialogHeader>

          <div className="space-y-4 px-5 py-5 sm:px-6">
            <div className="flex justify-center gap-2">
              {(['AM', 'PM'] as TimePeriod[]).map((period) => (
                <Button
                  key={period}
                  type="button"
                  size="sm"
                  variant={draft.period === period ? 'default' : 'outline'}
                  className="min-w-16"
                  onClick={() => setDraft((current) => ({ ...current, period }))}
                >
                  {period}
                </Button>
              ))}
            </div>

            <ClockDial
              phase={phase}
              hour12={draft.hour12}
              minute={draft.minute}
              onHourSelect={(hour12) => {
                setDraft((current) => ({ ...current, hour12 }))
                setPhase('minute')
              }}
              onMinuteSelect={(minute) => setDraft((current) => ({ ...current, minute }))}
            />

            {phase === 'minute' ? (
              <div className="flex items-center justify-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  aria-label="Decrease minute"
                  onClick={() => adjustMinute(-1)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <p className="min-w-24 text-center text-sm text-muted-foreground">
                  Fine tune: <span className="font-semibold text-foreground">{draft.minute}</span> min
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  aria-label="Increase minute"
                  onClick={() => adjustMinute(1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ) : null}

            <div className="flex justify-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={phase === 'hour' ? 'secondary' : 'ghost'}
                onClick={() => setPhase('hour')}
              >
                Hour
              </Button>
              <Button
                type="button"
                size="sm"
                variant={phase === 'minute' ? 'secondary' : 'ghost'}
                onClick={() => setPhase('minute')}
              >
                Minute
              </Button>
            </div>
          </div>

          <DialogFooter className="border-t px-5 py-4 sm:px-6">
            <Button type="button" className="w-full sm:w-auto" onClick={applyDraft}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
