import type { QueryClient } from '@tanstack/react-query'
import { fetchDashboardOverview } from '@/api/dashboard'
import {
  BALLOT_QUERY_KEY,
  BALLOT_STALE_MS,
  DASHBOARD_QUERY_KEY,
  DASHBOARD_STALE_MS,
  MEMBERS_STALE_MS,
} from '@/lib/query-sync'
import { scheduleIdle } from '@/lib/schedule-idle'
import {
  CandidatesPage,
  ElectionsPage,
  MembersPage,
  PositionsPage,
  preloadAdminPageModules,
  ReportsPage,
} from '@/routes/adminPages'
import { AdminDashboardPage, preloadAdminShell, preloadMemberShell } from '@/routes/corePages'

export { scheduleIdle } from '@/lib/schedule-idle'

const prefetchedNavRoutes = new Set<string>()

function markPrefetched(routeKey: string) {
  if (prefetchedNavRoutes.has(routeKey)) {
    return false
  }
  prefetchedNavRoutes.add(routeKey)
  return true
}

/** Load admin shell, page chunk, and dashboard API before first paint. */
export async function prepareAdminEntry(queryClient: QueryClient) {
  await Promise.all([
    preloadAdminShell(),
    queryClient.ensureQueryData({
      queryKey: DASHBOARD_QUERY_KEY,
      queryFn: () => fetchDashboardOverview(),
      staleTime: DASHBOARD_STALE_MS,
    }),
  ])
}

/** Load member shell and election state before first paint. */
export async function prepareMemberEntry(queryClient: QueryClient) {
  const [{ fetchBallot }, { fetchOngoingElection }] = await Promise.all([
    import('@/api/votes'),
    import('@/api/elections'),
  ])
  await Promise.all([
    preloadMemberShell(),
    queryClient.ensureQueryData({
      queryKey: ['elections', 'ongoing'],
      queryFn: fetchOngoingElection,
    }),
    queryClient.ensureQueryData({
      queryKey: BALLOT_QUERY_KEY,
      queryFn: fetchBallot,
      staleTime: BALLOT_STALE_MS,
    }),
  ])
}

export function prefetchAdminLanding(queryClient: QueryClient) {
  void queryClient.prefetchQuery({
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn: () => fetchDashboardOverview(),
    staleTime: DASHBOARD_STALE_MS,
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
      queryKey: ['members', '2nd Year', 1],
      queryFn: () => fetchMembers('2nd Year', 1),
      staleTime: MEMBERS_STALE_MS,
    })
    void queryClient.prefetchQuery({
      queryKey: ['members-deletion-status'],
      queryFn: fetchMemberDeletionStatus,
    })
  })
}

export async function prepareMembersPage(queryClient: QueryClient, page = 1) {
  const { fetchMembers } = await import('@/api/members')
  await Promise.all([
    MembersPage.preload(),
    queryClient.ensureQueryData({
      queryKey: ['members', '2nd Year', page],
      queryFn: () => fetchMembers('2nd Year', page),
      staleTime: MEMBERS_STALE_MS,
    }),
  ])
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
  prefetchPositions(queryClient)
  prefetchCandidatesData(queryClient)
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

/** Warm admin console after login or when the admin shell mounts. */
export function warmAdminConsole(queryClient: QueryClient) {
  void prepareAdminEntry(queryClient).catch(() => {
    prefetchAdminLanding(queryClient)
  })

  scheduleIdle(() => {
    void preloadAdminPageModules()
    prefetchSecondaryAdminData(queryClient)

    for (const route of ADMIN_NAV_PATHS) {
      prefetchedNavRoutes.add(`admin:${route}`)
    }
  })
}

/** Warm member console after login or when the member shell mounts. */
export function warmMemberConsole(queryClient: QueryClient) {
  void prepareMemberEntry(queryClient).catch(() => {
    prefetchMemberLanding(queryClient)
  })
}

export function prefetchAdminNavRoute(to: string, queryClient: QueryClient) {
  const routeKey = `admin:${to}`
  if (!markPrefetched(routeKey)) return

  switch (to) {
    case '/admin':
      void AdminDashboardPage.preload()
      prefetchAdminLanding(queryClient)
      break
    case '/admin/members':
      void prepareMembersPage(queryClient, 1).catch(() => {
        void MembersPage.preload()
        prefetchMembersData(queryClient)
      })
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
    case '/':
    case '/vote':
    case '/apply':
    case '/voting':
      prefetchMemberLanding(queryClient)
      break
    default:
      prefetchedNavRoutes.delete(routeKey)
  }
}

export function prefetchMemberLanding(queryClient: QueryClient) {
  void import('@/api/elections').then(({ fetchOngoingElection }) => {
    void queryClient.prefetchQuery({
      queryKey: ['elections', 'ongoing'],
      queryFn: fetchOngoingElection,
    })
  })
  void import('@/api/votes').then(({ fetchBallot }) => {
    void queryClient.prefetchQuery({
      queryKey: BALLOT_QUERY_KEY,
      queryFn: fetchBallot,
      staleTime: BALLOT_STALE_MS,
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
