import type { QueryClient, QueryKey } from '@tanstack/react-query'

export const DASHBOARD_QUERY_KEY = ['dashboard-overview'] as const
export const BALLOT_QUERY_KEY = ['ballot'] as const

/** Poll active dashboard every 10s (matches backend overview cache). */
export const DASHBOARD_POLL_MS = 10_000

/** Poll dashboard summary when election is not live. */
export const DASHBOARD_SUMMARY_POLL_MS = 15_000

/** Must stay below poll interval so interval refetches are not skipped. */
export const DASHBOARD_STALE_MS = 0

/** Ballot cache TTL — stable while the member reviews candidates. */
export const BALLOT_STALE_MS = 30_000

/** Members list cache TTL. */
export const MEMBERS_STALE_MS = 30_000

export const MEMBERS_QUERY_KEY = ['members'] as const

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

/** Refetch dashboard data immediately (active + inactive cache entries). */
export function refreshDashboard(queryClient: QueryClient) {
  void queryClient.refetchQueries({ queryKey: DASHBOARD_QUERY_KEY, type: 'all' })
}
