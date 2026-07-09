import { apiGet } from '@/api/client'
import type { DashboardOverview, DashboardSummary, LiveStats } from '@/types/api'

export async function fetchDashboardOverview(electionId?: number, academicYear?: string) {
  const params: Record<string, string | number> = {}
  if (electionId) params.election_id = electionId
  if (academicYear) params.academic_year = academicYear
  
  return apiGet<DashboardOverview>(
    '/dashboard/overview/',
    Object.keys(params).length > 0 ? params : undefined,
  )
}

export async function fetchDashboardSummary(electionId?: number, academicYear?: string) {
  const params: Record<string, string | number> = {}
  if (electionId) params.election_id = electionId
  if (academicYear) params.academic_year = academicYear
  
  return apiGet<DashboardSummary>('/dashboard/summary/', Object.keys(params).length > 0 ? params : undefined)
}

export async function fetchLiveStats(electionId?: number, academicYear?: string) {
  const params: Record<string, string | number> = {}
  if (electionId) params.election_id = electionId
  if (academicYear) params.academic_year = academicYear
  
  return apiGet<LiveStats>('/dashboard/live-stats/', Object.keys(params).length > 0 ? params : undefined)
}
