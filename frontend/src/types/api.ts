export type UserRole = 'ADMIN' | 'MEMBER'

export interface User {
  id: number
  cpm_number: string
  role: UserRole
  academic_year?: AcademicYear | null
  is_active: boolean
  has_changed_password: boolean
  created_at: string
}

export interface ApiError {
  code: string
  message: string
  details: Record<string, unknown> | null
}

export interface ApiSuccess<T> {
  success: true
  data: T
  message?: string
}

export interface ApiFailure {
  success: false
  error: ApiError
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure

export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface Member {
  id: number
  cpm_number: string
  mc_number: string
  academic_year?: AcademicYear
  is_active: boolean
  created_at: string
}

export interface MemberImportResult {
  total_rows: number
  successful: number
  failed_rows: { row: number; cpm_number: string; reason: string }[]
  duplicates: { row: number; cpm_number: string; reason: string }[]
}

export interface Position {
  id: number
  name: string
  academic_year?: AcademicYear | null
  importance: number
  max_winners: number
  created_at: string
  updated_at: string
}

export type AcademicYear = '2nd Year' | '3rd Year'

export interface Candidate {
  id: number
  full_name: string
  academic_year: AcademicYear
  photo_url: string
  position: number
  position_name: string
  created_at: string
  updated_at: string
}

export type ElectionStatus = 'DRAFT' | 'SCHEDULED' | 'ARCHIVED'

export type ElectionPhase = 
  | 'DRAFT' 
  | 'SCHEDULED' 
  | 'APPLICATIONS_OPEN' 
  | 'REVIEWING' 
  | 'READY_FOR_VOTING' 
  | 'VOTING_OPEN' 
  | 'VOTING_CLOSED' 
  | 'RESULTS_PUBLISHED' 
  | 'ARCHIVED'

export interface Election {
  id: number
  name: string
  status: ElectionStatus
  current_phase: ElectionPhase
  application_start_at: string | null
  application_end_at: string | null
  voting_start_at: string | null
  voting_end_at: string | null
  voting_started: boolean
  results_published: boolean
  require_all_positions_filled: boolean
  created_at: string
  updated_at: string
}

export interface BallotItem {
  position: Position
  candidates: Candidate[]
  has_voted: boolean
  my_candidate_id: number | null
}

export interface Ballot {
  election: Election | null
  positions: BallotItem[]
  can_vote: boolean
  election_ended: boolean
  vote_status: VoteStatus
}

export interface PublishedResultCandidate {
  candidate_id: number
  full_name: string
  photo_url: string
  vote_count: number
  rank: number
  vote_percentage: number
}

export interface PublishedResultPosition {
  position_id: number
  position_name: string
  academic_year?: AcademicYear | null
  total_votes: number
  winners: PublishedResultCandidate[]
  candidates: PublishedResultCandidate[]
}

export interface PublishedResults {
  election: Pick<Election, 'id' | 'name' | 'current_phase' | 'results_published'>
  positions: PublishedResultPosition[]
}

export interface DashboardOverview {
  summary: DashboardSummary
  live: LiveStats
}

export interface VoteStatus {
  election: Pick<Election, 'id' | 'name' | 'status' | 'current_phase' | 'voting_start_at' | 'voting_end_at'> | null
  votes: {
    position_id: number
    position_name: string
    candidate_id: number
    candidate_name: string
    voted_at: string
  }[]
  positions_voted: number
  positions_total: number
  positions_remaining: number
  all_positions_voted: boolean
  can_vote: boolean
  election_ended: boolean
}

export interface DashboardSummary {
  election: Pick<Election, 'id' | 'name' | 'status' | 'current_phase' | 'voting_start_at' | 'voting_end_at'> | null
  total_members: number
  total_candidates: number
  total_positions: number
  votes_cast: number
  turnout_percentage: number
  full_ballot_completion_percentage: number
  remaining_voters: number
  remaining_incomplete_ballot: number
  members_completed_ballot: number
  members_partial_ballot: number
  members_no_votes: number
  position_turnout: {
    position_id: number
    position_name: string
    votes_cast: number
    turnout_percentage: number
    remaining_voters: number
  }[]
}

export interface CandidateRanking {
  candidate_id: number
  full_name: string
  position_id: number
  position_name: string
  vote_count: number
  vote_percentage: number
  rank: number
}

export interface LiveStats {
  election: Pick<Election, 'id' | 'name' | 'status' | 'current_phase' | 'voting_start_at' | 'voting_end_at'> | null
  total_votes: number
  candidates: Omit<CandidateRanking, 'rank'>[]
  positions: {
    position_id: number
    position_name: string
    total_votes: number
    rankings: CandidateRanking[]
    winners: CandidateRanking[]
  }[]
  highest_voted_overall: CandidateRanking | null
  cached_seconds?: number
}

export type ReportType = 'results' | 'candidates' | 'turnout' | 'participation'
export type ExportFormat = 'csv' | 'xlsx' | 'pdf'
