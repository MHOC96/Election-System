import { apiGet, apiPost, apiUpload } from '@/api/client'
import type { Paginated } from '@/types/api'

export interface CandidateApplication {
  id: number
  election: number
  election_name: string
  member: number
  member_cpm: string
  member_mc: string
  member_academic_year: string | null
  position: number
  position_name: string
  full_name: string
  cpm_number: string
  contact_number: string
  photo_url: string
  declaration_file: string
  status: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN'
  rejection_reason: string
  submitted_at: string
}

export interface ApplicationListFilters {
  status?: string
  position?: number
  election?: number
  academic_year?: string
  search?: string
  page?: number
  page_size?: number
}

function unwrapList<T>(data: Paginated<T> | T[]): T[] {
  return Array.isArray(data) ? data : data.results
}

export async function fetchMyApplications() {
  const data = await apiGet<Paginated<CandidateApplication> | CandidateApplication[]>(
    '/candidates/applications/me/',
  )
  return unwrapList(data)
}

export async function fetchAllApplications(filters: ApplicationListFilters = {}) {
  const params: Record<string, string | number> = {}
  if (filters.status) params.status = filters.status
  if (filters.position) params.position = filters.position
  if (filters.election) params.election = filters.election
  if (filters.academic_year) params.academic_year = filters.academic_year
  if (filters.search) params.search = filters.search
  if (filters.page) params.page = filters.page
  if (filters.page_size) params.page_size = filters.page_size

  return apiGet<Paginated<CandidateApplication>>('/candidates/applications/all/', params)
}

export async function submitApplication(data: {
  position: number
  full_name: string
  cpm_number: string
  contact_number: string
  photo_url: string
  declaration_file: string
}) {
  return apiPost<CandidateApplication>('/candidates/applications/me/', data)
}

export async function uploadDeclarationForm(file: File) {
  const formData = new FormData()
  formData.append('document', file)
  return apiUpload<{ document_url: string }>('/candidates/applications/upload-document/', formData)
}

export async function uploadApplicationPhoto(file: File) {
  const formData = new FormData()
  formData.append('photo', file)
  return apiUpload<{ photo_url: string }>('/candidates/applications/upload-photo/', formData)
}

export async function reviewApplication(
  id: number,
  data: { action: 'APPROVE' | 'REJECT'; rejection_reason?: string },
) {
  return apiPost<CandidateApplication>(`/candidates/applications/${id}/review/`, data)
}
