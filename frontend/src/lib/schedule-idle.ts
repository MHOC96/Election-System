/** Run work after first paint without blocking the critical path. */
export function scheduleIdle(task: () => void) {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(task, { timeout: 2000 })
    return
  }
  globalThis.setTimeout(task, 0)
}
