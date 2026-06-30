import type { QueryClient } from '@tanstack/react-query'
import { fetchDashboardSummary } from '@/api/dashboard'
import { fetchPositions } from '@/api/positions'
import { fetchBallot } from '@/api/votes'

export function scheduleIdle(task: () => void) {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(task)
    return
  }
  globalThis.setTimeout(task, 150)
}

export function prefetchAdminData(queryClient: QueryClient) {
  void queryClient.prefetchQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => fetchDashboardSummary(),
  })
  void queryClient.prefetchQuery({
    queryKey: ['positions'],
    queryFn: fetchPositions,
  })
}

export function prefetchAdminRoutes() {
  void import('@/pages/admin/MembersPage')
  void import('@/pages/admin/PositionsPage')
  void import('@/pages/admin/CandidatesPage')
  void import('@/pages/admin/ElectionsPage')
  void import('@/pages/admin/ReportsPage')
  void import('@/pages/admin/AuditPage')
}

export function prefetchMemberData(queryClient: QueryClient) {
  void queryClient.prefetchQuery({
    queryKey: ['ballot'],
    queryFn: fetchBallot,
  })
}

export function prefetchMemberRoutes() {
  void import('@/pages/member/MyVotesPage')
}

export async function warmAdminLanding() {
  prefetchAdminRoutes()
}

export async function warmMemberLanding() {
  prefetchMemberRoutes()
}
