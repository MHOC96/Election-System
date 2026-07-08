import { apiDelete, apiGet, apiPatch, apiPost, apiUpload } from '@/api/client'
import type { Member, MemberImportResult, Paginated } from '@/types/api'

export async function fetchMembers(academicYear?: string, page = 1, pageSize = 50) {
  const params: Record<string, string | number> = { page, page_size: pageSize }
  if (academicYear) params.academic_year = academicYear
  return apiGet<Paginated<Member>>('/members/', params)
}

export async function importMembers(file: File, academicYear: string) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('academic_year', academicYear)
  return apiUpload<MemberImportResult>('/members/import/', formData)
}

export async function fetchMember(id: number) {
  return apiGet<Member>(`/members/${id}/`)
}

export async function fetchMemberDeletionStatus() {
  return apiGet<{ allowed: boolean }>('/members/deletion-status/')
}

export async function clearAllMembers(academicYear: string) {
  return apiPost<{ deleted: number }>('/members/clear-all/', { academic_year: academicYear })
}

export async function bulkDeleteMembers(ids: number[]) {
  return apiPost<{
    requested: number
    deleted: number
    deleted_members: { id: number; cpm_number: string }[]
    failed: { id: number; cpm_number: string; reason: string }[]
  }>('/members/bulk-delete/', { ids })
}

export async function deleteMember(id: number) {
  return apiDelete(`/members/${id}/`)
}

export async function updateMember(
  id: number,
  payload: { cpm_number?: string; mc_number?: string; is_active?: boolean },
) {
  return apiPatch<Member>(`/members/${id}/`, payload)
}
