import { apiDelete, apiGet, apiPatch, apiPost, apiUpload } from '@/api/client'
import type { AcademicYear, Candidate, Paginated } from '@/types/api'

function unwrapList<T>(data: Paginated<T> | T[]): T[] {
  return Array.isArray(data) ? data : data.results
}

export async function fetchCandidates(positionId?: number) {
  const data = await apiGet<Paginated<Candidate> | Candidate[]>(
    '/candidates/',
    positionId ? { position: positionId } : undefined,
  )
  return unwrapList(data)
}

export async function createCandidate(payload: {
  full_name: string
  academic_year: AcademicYear
  photo_url: string
  position: number
}) {
  return apiPost<Candidate>('/candidates/', payload)
}

export async function updateCandidate(
  id: number,
  payload: Partial<{
    full_name: string
    academic_year: AcademicYear
    photo_url: string
    position: number
  }>,
) {
  return apiPatch<Candidate>(`/candidates/${id}/`, payload)
}

export async function deleteCandidate(id: number) {
  return apiDelete(`/candidates/${id}/`)
}

export async function uploadCandidatePhoto(file: File) {
  const formData = new FormData()
  formData.append('photo', file)
  return apiUpload<{ photo_url: string; public_id: string }>('/candidates/upload-photo/', formData)
}
