import type { Candidate, Position, ElectionForm } from '@/types/api'

export function canCreateElection(): boolean {
  return true
}

export function getCreateElectionBlockReason(): string | null {
  return null
}

export function canScheduleElection(
  formValues?: Partial<any>
): boolean {
  return true
}

export function getElectionScheduleBlockReason(
  formValues?: Partial<any>
): string | null {
  return null
}
