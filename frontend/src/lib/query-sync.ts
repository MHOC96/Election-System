import type { QueryClient, QueryKey } from '@tanstack/react-query'

export const DASHBOARD_QUERY_KEY = ['dashboard-overview'] as const
export const BALLOT_QUERY_KEY = ['ballot'] as const

/** Default academic-year tab on the admin dashboard (must match AdminDashboardPage). */
export const DASHBOARD_DEFAULT_ACADEMIC_YEAR = '2nd Year' as const

export function dashboardOverviewQueryKey(
  academicYear: string = DASHBOARD_DEFAULT_ACADEMIC_YEAR,
  electionId?: number,
) {
  if (electionId != null) {
    return [...DASHBOARD_QUERY_KEY, electionId, academicYear] as const
  }
  return [...DASHBOARD_QUERY_KEY, academicYear] as const
}

/** Poll active dashboard every 25s (matches backend overview cache). */
export const DASHBOARD_POLL_MS = 25_000

/** Poll dashboard summary when election is not live. */
export const DASHBOARD_SUMMARY_POLL_MS = 30_000

/** Align with backend overview TTL (25s); keep below poll interval. */
export const DASHBOARD_STALE_MS = 22_000

/** Ballot cache TTL — stable while the member reviews candidates. */
export const BALLOT_STALE_MS = 30_000

/** Members list cache TTL. */
export const MEMBERS_STALE_MS = 30_000

export const MEMBERS_QUERY_KEY = ['members'] as const

export const POSITIONS_QUERY_KEY = ['positions'] as const

export const CANDIDATES_QUERY_KEY = ['candidates'] as const

export const ELECTIONS_QUERY_KEY = ['elections'] as const

export const APPLICATIONS_QUERY_KEY = ['applications'] as const

export const MEMBERS_READINESS_QUERY_KEY = ['members', 'readiness'] as const

/** Positions change infrequently; align with backend list cache (60s). */
export const POSITIONS_STALE_MS = 60_000

export const PUBLISHED_RESULTS_QUERY_KEY = ['elections', 'published-results'] as const

/** Published results are immutable until admin republishes. */
export const PUBLISHED_RESULTS_STALE_MS = 5 * 60 * 1000

/** Member application list while applications are open. */
export const APPLICATIONS_STALE_MS = 30_000

export const MEMBERS_DELETION_STATUS_QUERY_KEY = ['members-deletion-status'] as const

/** Deletion allowed only changes with election lifecycle — invalidate on mutations. */
export const MEMBERS_DELETION_STATUS_STALE_MS = 60_000

export const MEMBERS_DELETION_STATUS_POLL_MS = 60_000

export const CANDIDATES_MODIFICATION_STATUS_QUERY_KEY = ['candidates-modification-status'] as const

export const CANDIDATES_MODIFICATION_STATUS_STALE_MS = 60_000

export const CANDIDATES_MODIFICATION_STATUS_POLL_MS = 60_000

export const ONGOING_ELECTION_QUERY_KEY = ['elections', 'ongoing'] as const

/** Poll ongoing election for member phase routing (30s). */
export const ONGOING_ELECTION_POLL_MS = 30_000

/** Keep below poll interval to avoid redundant refetches across member surfaces. */
export const ONGOING_ELECTION_STALE_MS = 25_000

export const REPORTS_STATUS_QUERY_KEY = ['reports-status'] as const

/** Reports availability changes only after election archive. */
export const REPORTS_STATUS_STALE_MS = 5 * 60 * 1000

/** Fetch fresh data and write it directly into the query cache (bypasses staleTime). */
export async function fetchAndSetQueryData<T>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  queryFn: () => Promise<T>,
): Promise<T> {
  const data = await queryFn()
  queryClient.setQueryData(queryKey, data)
  return data
}

/** Mark sibling queries stale without refetching them immediately. */
export function markQueriesStale(queryClient: QueryClient, queryKey: QueryKey) {
  void queryClient.invalidateQueries({ queryKey, refetchType: 'none' })
}

/** Invalidate and refetch mounted queries only (avoids background tab / prefetch refetches). */
export function invalidateAndRefetch(queryClient: QueryClient, queryKey: QueryKey) {
  void queryClient.invalidateQueries({ queryKey, refetchType: 'active' })
}

/** Refetch dashboard overview only where a component is currently subscribed. */
export function refreshDashboard(queryClient: QueryClient) {
  void queryClient.refetchQueries({
    queryKey: DASHBOARD_QUERY_KEY,
    type: 'active',
  })
}

function markElectionSupportQueriesStale(queryClient: QueryClient) {
  markQueriesStale(queryClient, MEMBERS_DELETION_STATUS_QUERY_KEY)
  markQueriesStale(queryClient, CANDIDATES_MODIFICATION_STATUS_QUERY_KEY)
  markQueriesStale(queryClient, MEMBERS_READINESS_QUERY_KEY)
  markQueriesStale(queryClient, REPORTS_STATUS_QUERY_KEY)
  markQueriesStale(queryClient, PUBLISHED_RESULTS_QUERY_KEY)
}

/**
 * After election delete — cascade-deleted candidates/applications/votes must disappear
 * without a manual refresh.
 */
export function invalidateAfterElectionDeleted(queryClient: QueryClient) {
  invalidateAndRefetch(queryClient, ELECTIONS_QUERY_KEY)
  invalidateAndRefetch(queryClient, CANDIDATES_QUERY_KEY)
  invalidateAndRefetch(queryClient, APPLICATIONS_QUERY_KEY)
  invalidateAndRefetch(queryClient, ONGOING_ELECTION_QUERY_KEY)
  invalidateAndRefetch(queryClient, BALLOT_QUERY_KEY)
  markElectionSupportQueriesStale(queryClient)
  refreshDashboard(queryClient)
}

/** After archive / publish / schedule / start voting — refresh member and admin surfaces. */
export function invalidateAfterElectionLifecycleChange(
  queryClient: QueryClient,
  action: 'schedule' | 'publish' | 'archive' | 'start_voting',
) {
  invalidateAndRefetch(queryClient, ONGOING_ELECTION_QUERY_KEY)

  if (action === 'archive') {
    invalidateAndRefetch(queryClient, CANDIDATES_QUERY_KEY)
    invalidateAndRefetch(queryClient, APPLICATIONS_QUERY_KEY)
    invalidateAndRefetch(queryClient, BALLOT_QUERY_KEY)
    markQueriesStale(queryClient, REPORTS_STATUS_QUERY_KEY)
    markQueriesStale(queryClient, MEMBERS_DELETION_STATUS_QUERY_KEY)
    markQueriesStale(queryClient, CANDIDATES_MODIFICATION_STATUS_QUERY_KEY)
    markQueriesStale(queryClient, MEMBERS_READINESS_QUERY_KEY)
  }

  if (action === 'publish') {
    markQueriesStale(queryClient, PUBLISHED_RESULTS_QUERY_KEY)
    markQueriesStale(queryClient, REPORTS_STATUS_QUERY_KEY)
    markQueriesStale(queryClient, MEMBERS_DELETION_STATUS_QUERY_KEY)
    markQueriesStale(queryClient, MEMBERS_READINESS_QUERY_KEY)
  }

  if (action === 'schedule') {
    markQueriesStale(queryClient, CANDIDATES_MODIFICATION_STATUS_QUERY_KEY)
    markQueriesStale(queryClient, MEMBERS_READINESS_QUERY_KEY)
  }

  if (action === 'start_voting') {
    invalidateAndRefetch(queryClient, BALLOT_QUERY_KEY)
    markQueriesStale(queryClient, CANDIDATES_MODIFICATION_STATUS_QUERY_KEY)
  }

  refreshDashboard(queryClient)
}

/** Candidate or position changes that affect ballot and dashboard counts. */
export function invalidateCandidateSurfaces(queryClient: QueryClient) {
  invalidateAndRefetch(queryClient, CANDIDATES_QUERY_KEY)
  markQueriesStale(queryClient, CANDIDATES_MODIFICATION_STATUS_QUERY_KEY)

  const phase = queryClient.getQueryData<{ current_phase?: string }>(ONGOING_ELECTION_QUERY_KEY)
    ?.current_phase
  if (phase === 'VOTING_OPEN') {
    invalidateAndRefetch(queryClient, BALLOT_QUERY_KEY)
  }

  refreshDashboard(queryClient)
}

/** Position changes can affect candidate groupings and election readiness. */
export function invalidatePositionSurfaces(queryClient: QueryClient) {
  invalidateAndRefetch(queryClient, POSITIONS_QUERY_KEY)
  invalidateAndRefetch(queryClient, CANDIDATES_QUERY_KEY)
  markQueriesStale(queryClient, MEMBERS_READINESS_QUERY_KEY)
  refreshDashboard(queryClient)
}
