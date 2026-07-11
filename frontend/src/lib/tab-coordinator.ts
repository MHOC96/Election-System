const CHANNEL_NAME = 'ems-tab-coordinator'

type PollLeaseMessage = {
  type: 'poll-lease'
  key: string
  until: number
}

let channel: BroadcastChannel | null = null
const remoteLeases = new Map<string, number>()

function serializeQueryKey(queryKey: readonly unknown[]): string {
  return JSON.stringify(queryKey)
}

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null
  if (!channel) channel = new BroadcastChannel(CHANNEL_NAME)
  return channel
}

export function initTabCoordinator(): () => void {
  const ch = getChannel()
  if (!ch) return () => {}

  const handler = (event: MessageEvent<PollLeaseMessage>) => {
    const data = event.data
    if (data?.type !== 'poll-lease') return
    remoteLeases.set(data.key, data.until)
  }

  ch.addEventListener('message', handler)
  return () => ch.removeEventListener('message', handler)
}

export function shouldOwnPoll(queryKey: readonly unknown[], leaseMs: number): boolean {
  const key = serializeQueryKey(queryKey)
  const until = remoteLeases.get(key) ?? 0
  if (Date.now() < until) return false

  const ch = getChannel()
  if (!ch) return true

  const ownUntil = Date.now() + leaseMs
  remoteLeases.set(key, ownUntil)
  ch.postMessage({ type: 'poll-lease', key, until: ownUntil } satisfies PollLeaseMessage)
  return true
}

export function releasePollLease(queryKey: readonly unknown[]) {
  const key = serializeQueryKey(queryKey)
  remoteLeases.delete(key)
}
