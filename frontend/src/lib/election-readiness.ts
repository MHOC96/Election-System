import type { Election } from '@/types/api'

export interface ElectionReadinessInput {
  elections?: Election[]
  positionCount?: number
  memberCount?: number
}

function hasActiveElection(elections: Election[] | undefined): boolean {
  return (elections ?? []).some((election) => election.status !== 'ARCHIVED')
}

export function canCreateElection(input: ElectionReadinessInput): boolean {
  return !hasActiveElection(input.elections)
}

export function getCreateElectionBlockReason(input: ElectionReadinessInput): string | null {
  if (canCreateElection(input)) return null
  return 'Archive or finish the current election before creating a new one.'
}

export function canScheduleElection(input: ElectionReadinessInput): boolean {
  const positionCount = input.positionCount ?? 0
  const memberCount = input.memberCount ?? 0
  return positionCount > 0 && memberCount > 0
}

export function getElectionScheduleBlockReason(input: ElectionReadinessInput): string | null {
  if (canScheduleElection(input)) return null

  const positionCount = input.positionCount ?? 0
  const memberCount = input.memberCount ?? 0

  if (positionCount === 0 && memberCount === 0) {
    return 'Add positions and import members before opening applications.'
  }
  if (positionCount === 0) {
    return 'Add at least one position before opening applications.'
  }
  return 'Import members before opening applications.'
}
