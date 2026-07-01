import { apiGet } from '@/api/client'
import type { AuditLog, Paginated } from '@/types/api'

export interface AuditLogRecent {
  id: number
  actor_cpm_number: string | null
  action: string
  created_at: string
}

export async function fetchRecentAuditLogs(limit = 5) {
  return apiGet<AuditLogRecent[]>('/audit-logs/recent/', { limit })
}

export async function fetchAuditLogs(params?: {
  page?: number
  action?: string
  actor_id?: number
  actor_cpm?: string
  from_date?: string
  to_date?: string
}) {
  const data = await apiGet<Paginated<AuditLog>>('/audit-logs/', params)
  return data
}

export async function fetchAuditLog(id: number) {
  return apiGet<AuditLog>(`/audit-logs/${id}/`)
}
