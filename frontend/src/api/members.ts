import { api, apiDelete, apiGet, apiPatch, apiPost } from '@/api/client'
import type {
  Member,
  MemberImportAsyncStart,
  MemberImportJobState,
  MemberImportResult,
  Paginated,
} from '@/types/api'

const ASYNC_IMPORT_ROW_THRESHOLD = 500
const IMPORT_POLL_INTERVAL_MS = 1500
const IMPORT_POLL_TIMEOUT_MS = 10 * 60 * 1000

export { ASYNC_IMPORT_ROW_THRESHOLD }

export async function fetchMembers(academicYear?: string, page = 1, pageSize = 50) {
  const params: Record<string, string | number> = { page, page_size: pageSize }
  if (academicYear) params.academic_year = academicYear
  return apiGet<Paginated<Member>>('/members/', params)
}

function unwrapImportResponse<T>(response: { success: boolean; data?: T; error?: { message: string } }): T {
  if (response.success === false || response.data === undefined) {
    throw new Error(response.error?.message ?? 'Import failed.')
  }
  return response.data
}

function isAsyncImportStart(data: MemberImportResult | MemberImportAsyncStart): data is MemberImportAsyncStart {
  return 'async' in data && data.async === true && 'job_id' in data
}

export async function fetchMemberImportJob(jobId: number) {
  return apiGet<MemberImportJobState>(`/members/import/${jobId}/`)
}

async function pollMemberImportJob(jobId: number): Promise<MemberImportResult> {
  const started = Date.now()

  while (Date.now() - started < IMPORT_POLL_TIMEOUT_MS) {
    const job = await fetchMemberImportJob(jobId)
    if (job.status === 'COMPLETED' && job.result) {
      return job.result
    }
    if (job.status === 'FAILED') {
      throw new Error(job.error_message ?? 'Import failed.')
    }
    await new Promise((resolve) => window.setTimeout(resolve, IMPORT_POLL_INTERVAL_MS))
  }

  throw new Error('Import is taking longer than expected. Refresh the page and check members shortly.')
}

export async function importMembers(file: File, academicYear: string): Promise<MemberImportResult> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('academic_year', academicYear)

  const { data, status } = await api.post<{
    success: boolean
    data?: MemberImportResult | MemberImportAsyncStart
    error?: { message: string }
  }>('/members/import/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    validateStatus: (code) => code === 200 || code === 202,
  })

  const payload = unwrapImportResponse(data)
  if (status === 202 && isAsyncImportStart(payload)) {
    return pollMemberImportJob(payload.job_id)
  }

  return payload as MemberImportResult
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
  payload: { cpm_number?: string; is_active?: boolean },
) {
  return apiPatch<Member>(`/members/${id}/`, payload)
}

export async function resetMemberPassword(id: number) {
  return apiPost<{ message: string }>(`/members/${id}/reset-password/`, {})
}
