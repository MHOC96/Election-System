import { apiGet } from '@/api/client'
import type { DashboardOverview, DashboardSummary, LiveStats } from '@/types/api'

export async function fetchDashboardOverview(electionId?: number) {
  return apiGet<DashboardOverview>(
    '/dashboard/overview/',
    electionId ? { election_id: electionId } : undefined,
  )
}

export async function fetchDashboardSummary(electionId?: number) {
  return apiGet<DashboardSummary>('/dashboard/summary/', electionId ? { election_id: electionId } : undefined)
}

export async function fetchLiveStats(electionId?: number) {
  return apiGet<LiveStats>('/dashboard/live-stats/', electionId ? { election_id: electionId } : undefined)
}
