import type { QueryClient } from '@tanstack/react-query'
import { fetchDashboardOverview } from '@/api/dashboard'
import { consumeFreshLogin } from '@/lib/auth-storage'
import {
  BALLOT_QUERY_KEY,
  BALLOT_STALE_MS,
  DASHBOARD_DEFAULT_ACADEMIC_YEAR,
  DASHBOARD_STALE_MS,
  dashboardOverviewQueryKey,
  MEMBERS_STALE_MS,
  ONGOING_ELECTION_QUERY_KEY,
  POSITIONS_QUERY_KEY,
  POSITIONS_STALE_MS,
  REPORTS_STATUS_QUERY_KEY,
  REPORTS_STATUS_STALE_MS,
} from '@/lib/query-sync'
import { scheduleIdle } from '@/lib/schedule-idle'
import {
  CandidatesPage,
  ElectionsPage,
  MembersPage,
  PositionsPage,
  preloadAdminPageModules,
  ReportsPage,
  ApplicationReviewPage,
} from '@/routes/adminPages'
import { AdminDashboardPage, preloadAdminShell, preloadMemberShell } from '@/routes/corePages'

export { scheduleIdle } from '@/lib/schedule-idle'

const prefetchedNavRoutes = new Set<string>()

let adminConsoleWarmed = false
let memberConsoleWarmed = false

export function resetConsoleWarmupState() {
  adminConsoleWarmed = false
  memberConsoleWarmed = false
  prefetchedNavRoutes.clear()
}

function markPrefetched(routeKey: string) {
  if (prefetchedNavRoutes.has(routeKey)) {
    return false
  }
  prefetchedNavRoutes.add(routeKey)
  return true
}

function shouldPrefetchBallot(phase: string | undefined): boolean {
  return phase === 'VOTING_OPEN'
}

function shouldPrefetchApplications(phase: string | undefined): boolean {
  return phase === 'VOTING_OPEN' || phase === 'APPLICATIONS_OPEN' || phase === 'SCHEDULED'
}

function prefetchApplicationPageData(queryClient: QueryClient) {
  prefetchPositions(queryClient)
  void import('@/api/applications').then(({ fetchMyApplications }) => {
    void queryClient.prefetchQuery({
      queryKey: ['applications', 'me'],
      queryFn: fetchMyApplications,
      staleTime: 30_000,
    })
  })
}

/** Load admin shell, page chunk, and dashboard API before first paint. */
export async function prepareAdminEntry(queryClient: QueryClient) {
  await Promise.all([
    preloadAdminShell(),
    queryClient.ensureQueryData({
      queryKey: dashboardOverviewQueryKey(),
      queryFn: () => fetchDashboardOverview(undefined, DASHBOARD_DEFAULT_ACADEMIC_YEAR),
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

  const election = await queryClient.ensureQueryData({
    queryKey: ONGOING_ELECTION_QUERY_KEY,
    queryFn: fetchOngoingElection,
  })

  const tasks: Promise<unknown>[] = [preloadMemberShell()]

  if (shouldPrefetchBallot(election?.current_phase)) {
    tasks.push(
      queryClient.ensureQueryData({
        queryKey: BALLOT_QUERY_KEY,
        queryFn: fetchBallot,
        staleTime: BALLOT_STALE_MS,
      }),
    )
  }

  if (shouldPrefetchApplications(election?.current_phase)) {
    prefetchApplicationPageData(queryClient)
  }

  await Promise.all(tasks)
}

export function prefetchAdminLanding(queryClient: QueryClient) {
  for (const year of ['3rd Year', '2nd Year'] as const) {
    void queryClient.prefetchQuery({
      queryKey: dashboardOverviewQueryKey(year),
      queryFn: () => fetchDashboardOverview(undefined, year),
      staleTime: DASHBOARD_STALE_MS,
    })
  }
}

export function prefetchPositions(queryClient: QueryClient) {
  void import('@/api/positions').then(({ fetchPositions }) => {
    void queryClient.prefetchQuery({
      queryKey: POSITIONS_QUERY_KEY,
      queryFn: fetchPositions,
      staleTime: POSITIONS_STALE_MS,
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

function prefetchReportsData(queryClient: QueryClient) {
  void import('@/api/reports').then(({ fetchReportsStatus }) => {
    void queryClient.prefetchQuery({
      queryKey: REPORTS_STATUS_QUERY_KEY,
      queryFn: fetchReportsStatus,
      staleTime: REPORTS_STATUS_STALE_MS,
    })
  })
}

function prefetchSecondaryAdminData(queryClient: QueryClient) {
  prefetchPositions(queryClient)
  prefetchReportsData(queryClient)
}

/** Warm admin console after login or when the admin shell mounts. */
export function warmAdminConsole(queryClient: QueryClient) {
  if (adminConsoleWarmed) return
  adminConsoleWarmed = true

  const freshFromLogin = consumeFreshLogin()
  if (!freshFromLogin) {
    void prepareAdminEntry(queryClient).catch(() => {
      void queryClient.prefetchQuery({
        queryKey: dashboardOverviewQueryKey(),
        queryFn: () => fetchDashboardOverview(undefined, DASHBOARD_DEFAULT_ACADEMIC_YEAR),
        staleTime: DASHBOARD_STALE_MS,
      })
    })
  }

  scheduleIdle(() => {
    void preloadAdminPageModules()
    prefetchSecondaryAdminData(queryClient)
  })
}

/** Warm member console after login or when the member shell mounts. */
export function warmMemberConsole(queryClient: QueryClient) {
  if (memberConsoleWarmed) return
  memberConsoleWarmed = true

  const freshFromLogin = consumeFreshLogin()
  if (!freshFromLogin) {
    void prepareMemberEntry(queryClient).catch(() => {
      prefetchMemberLanding(queryClient)
    })
  }
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
    case '/admin/applications':
      void ApplicationReviewPage.preload()
      void import('@/api/applications').then(({ fetchAllApplications }) => {
        void queryClient.prefetchQuery({
          queryKey: ['applications', 'all', 'PENDING_REVIEW', '3rd Year', 1],
          queryFn: () =>
            fetchAllApplications({ status: 'PENDING_REVIEW', academic_year: '3rd Year', page: 1 }),
        })
      })
      break
    case '/admin/elections':
      void ElectionsPage.preload()
      prefetchElectionsData(queryClient)
      break
    case '/admin/reports':
      void ReportsPage.preload()
      prefetchReportsData(queryClient)
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
    void queryClient
      .fetchQuery({
        queryKey: ONGOING_ELECTION_QUERY_KEY,
        queryFn: fetchOngoingElection,
      })
      .then((election) => {
        if (shouldPrefetchBallot(election?.current_phase)) {
          void import('@/api/votes').then(({ fetchBallot }) => {
            void queryClient.prefetchQuery({
              queryKey: BALLOT_QUERY_KEY,
              queryFn: fetchBallot,
              staleTime: BALLOT_STALE_MS,
            })
          })
        }
        if (shouldPrefetchApplications(election?.current_phase)) {
          prefetchApplicationPageData(queryClient)
        }
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
