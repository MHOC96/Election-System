import { useSyncExternalStore } from 'react'

type Listener = () => void

const targetSubscribers = new Map<string, Set<Listener>>()
const targetRemaining = new Map<string, number | null>()
let intervalId: number | null = null

function getRemaining(targetIso: string): number | null {
  const targetMs = new Date(targetIso).getTime()
  if (Number.isNaN(targetMs)) return null
  const diff = targetMs - Date.now()
  return diff > 0 ? diff : 0
}

function syncTarget(targetIso: string) {
  targetRemaining.set(targetIso, getRemaining(targetIso))
}

function tickAll() {
  for (const targetIso of targetSubscribers.keys()) {
    syncTarget(targetIso)
    targetSubscribers.get(targetIso)?.forEach((listener) => listener())
  }
}

function ensureInterval() {
  if (intervalId !== null) return
  intervalId = window.setInterval(tickAll, 1000)
}

function clearIntervalIfIdle() {
  if (targetSubscribers.size === 0 && intervalId !== null) {
    window.clearInterval(intervalId)
    intervalId = null
  }
}

function subscribeToTarget(targetIso: string, listener: Listener) {
  let listeners = targetSubscribers.get(targetIso)
  if (!listeners) {
    listeners = new Set()
    targetSubscribers.set(targetIso, listeners)
    syncTarget(targetIso)
  }
  listeners.add(listener)
  ensureInterval()

  return () => {
    listeners?.delete(listener)
    if (listeners?.size === 0) {
      targetSubscribers.delete(targetIso)
      targetRemaining.delete(targetIso)
    }
    clearIntervalIfIdle()
  }
}

function getSnapshot(targetIso: string | null | undefined): number | null {
  if (!targetIso) return null
  if (!targetRemaining.has(targetIso)) {
    syncTarget(targetIso)
  }
  return targetRemaining.get(targetIso) ?? null
}

export function useCountdown(targetIso: string | null | undefined): number | null {
  return useSyncExternalStore(
    (listener) => (targetIso ? subscribeToTarget(targetIso, listener) : () => {}),
    () => getSnapshot(targetIso),
    () => null,
  )
}

/** Test helper: reset shared countdown ticker state. */
export function resetCountdownTickerForTests() {
  if (intervalId !== null) {
    window.clearInterval(intervalId)
    intervalId = null
  }
  targetSubscribers.clear()
  targetRemaining.clear()
}
