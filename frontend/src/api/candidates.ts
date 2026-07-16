import { apiDelete, apiGet, apiPatch, apiPost, apiUpload } from '@/api/client'
import type { AcademicYear, Candidate, Paginated } from '@/types/api'

const CANDIDATES_PAGE_SIZE = 100

async function fetchAllCandidatePages(
  params: Record<string, string | number>,
): Promise<Candidate[]> {
  const first = await apiGet<Paginated<Candidate> | Candidate[]>('/candidates/', {
    ...params,
    page_size: CANDIDATES_PAGE_SIZE,
  })
  if (Array.isArray(first)) {
    return first
  }

  const all = [...first.results]
  let page = 2
  while (all.length < first.count) {
    const next = await apiGet<Paginated<Candidate>>('/candidates/', {
      ...params,
      page,
      page_size: CANDIDATES_PAGE_SIZE,
    })
    all.push(...next.results)
    if (!next.next || next.results.length === 0) {
      break
    }
    page += 1
  }
  return all
}

export async function fetchCandidates(positionId?: number, electionId?: number) {
  const params: Record<string, string | number> = {}
  if (positionId) params.position = positionId
  if (electionId) params.election = electionId
  return fetchAllCandidatePages(params)
}

export async function createCandidate(payload: {
  full_name: string
  academic_year: AcademicYear
  photo_url: string
  declaration_file: string
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
    declaration_file: string
    position: number
  }>,
) {
  return apiPatch<Candidate>(`/candidates/${id}/`, payload)
}

export async function deleteCandidate(id: number) {
  return apiDelete(`/candidates/${id}/`)
}

export async function clearAllCandidates() {
  return apiPost<{
    deleted: number
    skipped: { id: number; full_name: string; reason: string }[]
  }>('/candidates/clear-all/')
}

export async function uploadCandidatePhoto(file: File) {
  const formData = new FormData()
  formData.append('photo', file)
  return apiUpload<{ photo_url: string; public_id: string }>('/candidates/upload-photo/', formData)
}

export async function uploadCandidateDeclaration(file: File) {
  const formData = new FormData()
  formData.append('document', file)
  return apiUpload<{ document_url: string }>('/candidates/upload-declaration/', formData)
}

export async function fetchModificationStatus() {
  const data = await apiGet<{ allowed: boolean; reason?: string }>('/candidates/modification-status/')
  return data
}

/** User-facing copy aligned with backend `assert_candidate_changes_allowed`. */
export function getCandidateModificationNotice(reason?: string): string {
  if (reason === 'No active election') {
    return 'No election is scheduled yet. Create and schedule an election before adding or editing candidates.'
  }
  return (
    reason ??
    'Candidates cannot be modified while applications are open or after voting begins. You can manage candidates while the election is being set up or during the review period before voting starts.'
  )
}

