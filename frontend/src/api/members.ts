import { api, apiDelete, apiGet, apiPatch, apiUpload } from '@/api/client'
import type { Member, MemberImportResult, Paginated } from '@/types/api'

export async function fetchMembers(page = 1) {
  const { data } = await api.get<Paginated<Member>>('/members/', { params: { page } })
  return data
}

export async function importMembers(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return apiUpload<MemberImportResult>('/members/import/', formData)
}

export async function fetchMember(id: number) {
  return apiGet<Member>(`/members/${id}/`)
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
