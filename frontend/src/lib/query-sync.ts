import type { QueryClient, QueryKey } from '@tanstack/react-query'

export const DASHBOARD_QUERY_KEY = ['dashboard-overview'] as const

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
