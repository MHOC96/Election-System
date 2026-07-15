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

/** Poll active dashboard every 10s (matches backend overview cache). */
export const DASHBOARD_POLL_MS = 10_000

/** Poll dashboard summary when election is not live. */
export const DASHBOARD_SUMMARY_POLL_MS = 15_000

/** Align with backend overview TTL (10s); keep below poll interval. */
export const DASHBOARD_STALE_MS = 9_000

/** Ballot cache TTL — stable while the member reviews candidates. */
export const BALLOT_STALE_MS = 30_000

/** Members list cache TTL. */
export const MEMBERS_STALE_MS = 30_000

export const MEMBERS_QUERY_KEY = ['members'] as const

export const POSITIONS_QUERY_KEY = ['positions'] as const

/** Positions change infrequently; align with backend list cache (60s). */
export const POSITIONS_STALE_MS = 60_000

export const PUBLISHED_RESULTS_QUERY_KEY = ['elections', 'published-results'] as const

/** Published results are immutable until admin republishes. */
export const PUBLISHED_RESULTS_STALE_MS = 5 * 60 * 1000

/** Member application list while applications are open. */
export const APPLICATIONS_STALE_MS = 30_000

export const ONGOING_ELECTION_QUERY_KEY = ['elections', 'ongoing'] as const

/** Poll ongoing election for member phase routing (15s). */
export const ONGOING_ELECTION_POLL_MS = 15_000

/** Keep below poll interval to avoid redundant refetches across member surfaces. */
export const ONGOING_ELECTION_STALE_MS = 12_000

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

/** Refetch dashboard overview for one academic-year tab (avoids multi-tab refetch storms). */
export function refreshDashboard(
  queryClient: QueryClient,
  academicYear: string = DASHBOARD_DEFAULT_ACADEMIC_YEAR,
) {
  void queryClient.refetchQueries({
    queryKey: dashboardOverviewQueryKey(academicYear),
    type: 'all',
  })
}
