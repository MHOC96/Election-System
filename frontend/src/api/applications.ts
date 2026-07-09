import { apiGet, apiPost, apiUpload } from '@/api/client'
import type { Paginated } from '@/types/api'

export interface CandidateApplication {
  id: number
  election: number
  election_name: string
  member: number
  member_cpm: string
  member_academic_year: string | null
  position: number
  position_name: string
  full_name: string
  mc_number: string
  cpm_number: string
  contact_number: string
  photo_url: string
  declaration_file: string
  status: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN'
  rejection_reason: string
  submitted_at: string
}

export async function fetchMyApplications() {
  const data = await apiGet<Paginated<CandidateApplication> | CandidateApplication[]>('/candidates/applications/me/')
  return Array.isArray(data) ? data : data.results
}

export async function fetchAllApplications(filters?: { status?: string, position?: number }) {
  const params = new URLSearchParams()
  if (filters?.status) params.append('status', filters.status)
  if (filters?.position) params.append('position', filters.position.toString())
  
  const data = await apiGet<Paginated<CandidateApplication> | CandidateApplication[]>(`/candidates/applications/all/?${params.toString()}`)
  return Array.isArray(data) ? data : data.results
}

export async function submitApplication(data: {
  position: number
  full_name: string
  mc_number: string
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

export async function reviewApplication(id: number, data: { action: 'APPROVE' | 'REJECT', rejection_reason?: string }) {
  return apiPost<CandidateApplication>(`/candidates/applications/${id}/review/`, data)
}
