import type { QueryClient } from '@tanstack/react-query'
import { scheduleIdle } from '@/lib/schedule-idle'
import {
  CandidatesPage,
  ElectionsPage,
  MembersPage,
  PositionsPage,
  preloadAdminPageModules,
  ReportsPage,
} from '@/routes/adminPages'
import { preloadAdminShell, preloadMemberShell } from '@/routes/corePages'
import { preloadMemberPageModules } from '@/routes/memberPages'

export { scheduleIdle } from '@/lib/schedule-idle'

const prefetchedNavRoutes = new Set<string>()

function markPrefetched(routeKey: string) {
  if (prefetchedNavRoutes.has(routeKey)) {
    return false
  }
  prefetchedNavRoutes.add(routeKey)
  return true
}

/** Prefetch dashboard overview for admin landing. */
export function prefetchAdminLanding(queryClient: QueryClient) {
  void import('@/api/dashboard').then(({ fetchDashboardOverview }) => {
    void queryClient.prefetchQuery({
      queryKey: ['dashboard-overview'],
      queryFn: () => fetchDashboardOverview(),
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

function prefetchMembersData(queryClient: QueryClient) {
  void import('@/api/members').then(({ fetchMembers, fetchMemberDeletionStatus }) => {
    void queryClient.prefetchQuery({
      queryKey: ['members', 1],
      queryFn: () => fetchMembers(1),
    })
    void queryClient.prefetchQuery({
      queryKey: ['members-deletion-status'],
      queryFn: fetchMemberDeletionStatus,
    })
  })
}

function prefetchCandidatesData(queryClient: QueryClient) {
  prefetchPositions(queryClient)
  void import('@/api/candidates').then(({ fetchCandidates }) => {
    void queryClient.prefetchQuery({
      queryKey: ['candidates'],
      queryFn: () => fetchCandidates(undefined),
    })
  })
}

function prefetchElectionsData(queryClient: QueryClient) {
  void import('@/api/elections').then(({ fetchElections }) => {
    void queryClient.prefetchQuery({
      queryKey: ['elections'],
      queryFn: fetchElections,
    })
  })
}

function prefetchSecondaryAdminData(queryClient: QueryClient) {
  prefetchPositions(queryClient)
  prefetchMembersData(queryClient)
  prefetchCandidatesData(queryClient)
  prefetchElectionsData(queryClient)
}

/** Warm admin shell immediately; defer heavy module/API prefetch until idle. */
export function warmAdminConsole(queryClient: QueryClient) {
  void preloadAdminShell()
  prefetchAdminLanding(queryClient)

  scheduleIdle(() => {
    void preloadAdminPageModules()
    prefetchSecondaryAdminData(queryClient)

    for (const route of ADMIN_NAV_PATHS) {
      prefetchedNavRoutes.add(`admin:${route}`)
    }
  })
}

/** Warm member shell immediately; defer ballot API until idle. */
export function warmMemberConsole(queryClient: QueryClient) {
  void preloadMemberShell()

  scheduleIdle(() => {
    void preloadMemberPageModules()
    prefetchMemberLanding(queryClient)
    prefetchedNavRoutes.add('member:/vote')
  })
}

export function prefetchAdminNavRoute(to: string, queryClient: QueryClient) {
  const routeKey = `admin:${to}`
  if (!markPrefetched(routeKey)) return

  switch (to) {
    case '/admin':
      prefetchAdminLanding(queryClient)
      break
    case '/admin/members':
      void MembersPage.preload()
      prefetchMembersData(queryClient)
      break
    case '/admin/positions':
      void PositionsPage.preload()
      prefetchPositions(queryClient)
      break
    case '/admin/candidates':
      void CandidatesPage.preload()
      prefetchCandidatesData(queryClient)
      break
    case '/admin/elections':
      void ElectionsPage.preload()
      prefetchElectionsData(queryClient)
      break
    case '/admin/reports':
      void ReportsPage.preload()
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
      break
    default:
      prefetchedNavRoutes.delete(routeKey)
  }
}

export function prefetchMemberLanding(queryClient: QueryClient) {
  void import('@/api/votes').then(({ fetchBallot }) => {
    void queryClient.prefetchQuery({
      queryKey: ['ballot'],
      queryFn: fetchBallot,
    })
  })
}

const ADMIN_NAV_PATHS = [
  '/admin',
  '/admin/members',
  '/admin/positions',
  '/admin/candidates',
  '/admin/elections',
  '/admin/reports',
] as const

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
