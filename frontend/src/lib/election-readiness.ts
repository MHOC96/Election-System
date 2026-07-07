import type { Candidate, Position } from '@/types/api'

export function hasCandidates(candidates: Candidate[] | undefined): boolean {
  return (candidates?.length ?? 0) > 0
}

export function canCreateElection(candidates: Candidate[] | undefined): boolean {
  return hasCandidates(candidates)
}

export const CREATE_ELECTION_HINT = 'Add candidates first.'

export function getCreateElectionBlockReason(
  candidates: Candidate[] | undefined,
): string | null {
  if (!hasCandidates(candidates)) {
    return CREATE_ELECTION_HINT
  }
  return null
}

export function canStartElection(
  positions: Position[] | undefined,
  candidates: Candidate[] | undefined,
): boolean {
  if (!candidates?.length) return false
  if (!positions?.length) return true
  return positions.every((position) =>
    candidates.some((candidate) => candidate.position === position.id),
  )
}

export function getElectionStartBlockReason(
  positions: Position[] | undefined,
  candidates: Candidate[] | undefined,
): string | null {
  if (!candidates?.length) {
    return 'Add at least one candidate before starting the election.'
  }

  if (!positions?.length) return null

  const missing = positions.filter(
    (position) => !candidates.some((candidate) => candidate.position === position.id),
  )
  if (!missing.length) return null

  const names = missing.map((position) => position.name).join(', ')
  return `Add candidates for every position before starting. Missing: ${names}.`
}
