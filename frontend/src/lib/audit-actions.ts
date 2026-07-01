/** Mirrors backend `audit.models.AuditAction` choices. */
export const AUDIT_ACTIONS = [
  { value: 'LOGIN', label: 'Login' },
  { value: 'LOGOUT', label: 'Logout' },
  { value: 'VOTE_SUBMITTED', label: 'Vote Submitted' },
  { value: 'MEMBER_IMPORT', label: 'Member Import' },
  { value: 'MEMBER_UPDATED', label: 'Member Updated' },
  { value: 'MEMBER_DELETED', label: 'Member Deleted' },
  { value: 'CANDIDATE_CREATED', label: 'Candidate Created' },
  { value: 'CANDIDATE_UPDATED', label: 'Candidate Updated' },
  { value: 'CANDIDATE_DELETED', label: 'Candidate Deleted' },
  { value: 'CANDIDATE_PHOTO_UPLOADED', label: 'Candidate Photo Uploaded' },
  { value: 'POSITION_CREATED', label: 'Position Created' },
  { value: 'POSITION_UPDATED', label: 'Position Updated' },
  { value: 'POSITION_DELETED', label: 'Position Deleted' },
  { value: 'ELECTION_CREATED', label: 'Election Created' },
  { value: 'ELECTION_STARTED', label: 'Election Started' },
  { value: 'ELECTION_STOPPED', label: 'Election Stopped' },
  { value: 'ELECTION_CLOSED', label: 'Election Closed' },
] as const

export function toDateRangeParams(fromDate: string, toDate: string) {
  const params: { from_date?: string; to_date?: string } = {}
  if (fromDate) {
    params.from_date = `${fromDate}T00:00:00`
  }
  if (toDate) {
    params.to_date = `${toDate}T23:59:59.999999`
  }
  return params
}
