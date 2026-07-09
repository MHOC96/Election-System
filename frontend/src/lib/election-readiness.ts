import type { Candidate, Position } from '@/types/api'

export function hasCandidates(candidates: Candidate[] | undefined): boolean {
  return (candidates?.length ?? 0) > 0
}

export function canCreateElection(candidates: Candidate[] | undefined): boolean {
  return true
}

export const CREATE_ELECTION_HINT = null

export function getCreateElectionBlockReason(
  candidates: Candidate[] | undefined,
): string | null {
  return null
}

export function canStartElection(
  positions: Position[] | undefined,
  candidates: Candidate[] | undefined,
): boolean {
  return hasCandidates(candidates)
}

export function getElectionStartBlockReason(
  positions: Position[] | undefined,
  candidates: Candidate[] | undefined,
): string | null {
  if (!hasCandidates(candidates)) {
    return 'Add at least one candidate before starting the election.'
  }
  return null
}
