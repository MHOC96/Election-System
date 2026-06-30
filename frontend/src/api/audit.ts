import { apiGet } from '@/api/client'
import type { AuditLog, Paginated } from '@/types/api'

export async function fetchAuditLogs(params?: {
  page?: number
  action?: string
  actor_id?: number
  from_date?: string
  to_date?: string
}) {
  const data = await apiGet<Paginated<AuditLog>>('/audit-logs/', params)
  return data
}

export async function fetchAuditLog(id: number) {
  return apiGet<AuditLog>(`/audit-logs/${id}/`)
}
