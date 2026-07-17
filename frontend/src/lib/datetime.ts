export function joinLocalDateTime(date: string, time: string): string {
  if (!date) return ''
  return `${date}T${time || '00:00'}`
}

export function splitLocalDateTime(value: string | undefined | null): { date: string; time: string } {
  if (!value) return { date: '', time: '' }
  const [date, timePart] = value.split('T')
  return { date: date ?? '', time: (timePart ?? '').slice(0, 5) }
}

export type TimePeriod = 'AM' | 'PM'

export interface LocalDateTimeParts {
  date: string
  hour12: number
  minute: number
  period: TimePeriod
}

export function to24Hour(hour12: number, period: TimePeriod): number {
  if (period === 'AM') return hour12 === 12 ? 0 : hour12
  return hour12 === 12 ? 12 : hour12 + 12
}

export function parseLocalDateTimeParts(value: string | null | undefined): LocalDateTimeParts {
  const { date, time } = splitLocalDateTime(value)
  const [hStr, mStr] = (time || '09:00').split(':')
  const h24 = Number(hStr)
  const minute = Number.isFinite(Number(mStr)) ? Number(mStr) : 0
  const period: TimePeriod = h24 >= 12 ? 'PM' : 'AM'
  let hour12 = h24 % 12
  if (hour12 === 0) hour12 = 12

  return {
    date,
    hour12: Number.isFinite(h24) ? hour12 : 9,
    minute,
    period,
  }
}

export function buildLocalDateTime(parts: LocalDateTimeParts): string {
  if (!parts.date) return ''
  const h24 = to24Hour(parts.hour12, parts.period)
  const time = `${String(h24).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`
  return joinLocalDateTime(parts.date, time)
}

export function parseTimeInputValue(
  time: string,
): Pick<LocalDateTimeParts, 'hour12' | 'minute' | 'period'> | null {
  if (!time) return null
  const [hStr, mStr] = time.split(':')
  const h24 = Number(hStr)
  const minute = Number(mStr)
  if (!Number.isFinite(h24) || !Number.isFinite(minute)) return null

  const clampedMinute = Math.min(59, Math.max(0, minute))
  const period: TimePeriod = h24 >= 12 ? 'PM' : 'AM'
  let hour12 = h24 % 12
  if (hour12 === 0) hour12 = 12

  return { hour12, minute: clampedMinute, period }
}

export function partsToTimeInputValue(parts: LocalDateTimeParts): string {
  if (!parts.date) return ''
  const h24 = to24Hour(parts.hour12, parts.period)
  return `${String(h24).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`
}

export function formatLocalDateTimePreview(value: string | null | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

const MINUTE_STEP = 1

export function formatTimePartsDisplay(parts: Pick<LocalDateTimeParts, 'hour12' | 'minute' | 'period'>): string {
  return `${parts.hour12}:${String(parts.minute).padStart(2, '0')} ${parts.period}`
}

export function formatVotingDuration(
  startIso: string | null | undefined,
  endIso: string | null | undefined,
): string | null {
  if (!startIso || !endIso) return null
  const start = new Date(startIso).getTime()
  const end = new Date(endIso).getTime()
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null

  const { days, hours, minutes } = splitCountdown(end - start)
  const parts: string[] = []
  if (days > 0) parts.push(`${days} day${days === 1 ? '' : 's'}`)
  if (hours > 0) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`)
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`)
  return parts.join(' ')
}

export function getMinuteOptions(currentMinute: number): number[] {
  const options = new Set<number>()
  for (let minute = 0; minute < 60; minute += MINUTE_STEP) {
    options.add(minute)
  }
  if (Number.isFinite(currentMinute)) {
    options.add(Math.min(59, Math.max(0, currentMinute)))
  }
  return Array.from(options).sort((a, b) => a - b)
}

/** Convert `<input type="datetime-local">` value (local wall time) to UTC ISO for the API. */
export function localInputToIso(value: string | undefined | null): string | undefined {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toISOString()
}

/** Convert API ISO timestamp to `<input type="datetime-local">` value in the user's timezone. */
export function isoToLocalInput(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function formatCountdown(ms: number): string {
  const { days, hours, minutes, seconds } = splitCountdown(ms)
  if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

export function splitCountdown(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  return {
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
  }
}
