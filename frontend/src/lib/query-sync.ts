import type { QueryClient, QueryKey } from '@tanstack/react-query'

export const DASHBOARD_QUERY_KEY = ['dashboard-overview'] as const
export const BALLOT_QUERY_KEY = ['ballot'] as const

/** Dashboard cache TTL — aligned with backend overview cache (~10s). */
export const DASHBOARD_STALE_MS = 15_000

/** Ballot cache TTL — stable while the member reviews candidates. */
export const BALLOT_STALE_MS = 30_000

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
