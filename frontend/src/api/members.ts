import { apiDelete, apiGet, apiPatch, apiPost, apiUpload } from '@/api/client'
import type { Member, MemberImportResult, Paginated } from '@/types/api'

export async function fetchMembers(page = 1, pageSize = 50) {
  return apiGet<Paginated<Member>>('/members/', { page, page_size: pageSize })
}

export async function importMembers(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return apiUpload<MemberImportResult>('/members/import/', formData)
}

export async function fetchMember(id: number) {
  return apiGet<Member>(`/members/${id}/`)
}

export async function fetchMemberDeletionStatus() {
  return apiGet<{ allowed: boolean }>('/members/deletion-status/')
}

export async function clearAllMembers() {
  return apiPost<{ deleted: number }>('/members/clear-all/')
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
