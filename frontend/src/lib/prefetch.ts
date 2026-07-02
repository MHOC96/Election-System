import type { QueryClient } from '@tanstack/react-query'

export function scheduleIdle(task: () => void) {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(task)
    return
  }
  globalThis.setTimeout(task, 150)
}

const prefetchedNavRoutes = new Set<string>()

function markPrefetched(routeKey: string) {
  if (prefetchedNavRoutes.has(routeKey)) {
    return false
  }
  prefetchedNavRoutes.add(routeKey)
  return true
}

/** Prefetch dashboard summary and live stats for admin landing. */
export function prefetchAdminLanding(queryClient: QueryClient) {
  void import('@/api/dashboard').then(({ fetchDashboardSummary, fetchLiveStats }) => {
    void queryClient.prefetchQuery({
      queryKey: ['dashboard-summary'],
      queryFn: () => fetchDashboardSummary(),
    })
    void queryClient.prefetchQuery({
      queryKey: ['dashboard-live'],
      queryFn: () => fetchLiveStats(),
    })
  })
}

export function prefetchPositions(queryClient: QueryClient) {
  void import('@/api/positions').then(({ fetchPositions }) => {
    void queryClient.prefetchQuery({
      queryKey: ['positions'],
      queryFn: fetchPositions,
    })
  })
}

export function prefetchAdminNavRoute(to: string, queryClient: QueryClient) {
  const routeKey = `admin:${to}`
  if (!markPrefetched(routeKey)) return

  switch (to) {
    case '/admin':
      prefetchAdminLanding(queryClient)
      void import('@/pages/admin/AdminDashboardPage')
      break
    case '/admin/members':
      void import('@/pages/admin/MembersPage')
      void import('@/api/members').then(({ fetchMembers }) => {
        void queryClient.prefetchQuery({
          queryKey: ['members', 1],
          queryFn: () => fetchMembers(1),
        })
      })
      break
    case '/admin/positions':
      void import('@/pages/admin/PositionsPage')
      prefetchPositions(queryClient)
      break
    case '/admin/candidates':
      void import('@/pages/admin/CandidatesPage')
      prefetchPositions(queryClient)
      void import('@/api/candidates').then(({ fetchCandidates }) => {
        void queryClient.prefetchQuery({
          queryKey: ['candidates'],
          queryFn: () => fetchCandidates(),
        })
      })
      break
    case '/admin/elections':
      void import('@/pages/admin/ElectionsPage')
      void import('@/api/elections').then(({ fetchElections }) => {
        void queryClient.prefetchQuery({
          queryKey: ['elections'],
          queryFn: fetchElections,
        })
      })
      break
    case '/admin/reports':
      void import('@/pages/admin/ReportsPage')
      break
    default:
      prefetchedNavRoutes.delete(routeKey)
  }
}

export function prefetchMemberNavRoute(to: string, queryClient: QueryClient) {
  const routeKey = `member:${to}`
  if (!markPrefetched(routeKey)) return

  switch (to) {
    case '/vote':
      prefetchMemberLanding(queryClient)
      void import('@/pages/member/BallotPage')
      break
    default:
      prefetchedNavRoutes.delete(routeKey)
  }
}

export function prefetchMemberLanding(queryClient: QueryClient) {
  void import('@/api/votes').then(({ fetchBallot, fetchVoteStatus }) => {
    void queryClient.prefetchQuery({
      queryKey: ['ballot'],
      queryFn: fetchBallot,
    })
    void queryClient.prefetchQuery({
      queryKey: ['my-votes'],
      queryFn: fetchVoteStatus,
    })
  })
}

export function handleNavPrefetch(
  to: string,
  queryClient: QueryClient,
  scope: 'admin' | 'member',
) {
  if (scope === 'admin') {
    prefetchAdminNavRoute(to, queryClient)
    return
  }
  prefetchMemberNavRoute(to, queryClient)
}
