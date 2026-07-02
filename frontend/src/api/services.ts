import {
  api,
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  apiUpload,
  downloadReport as downloadReportFile,
} from '@/api/client'
import type {
  Ballot,
  Candidate,
  DashboardSummary,
  Election,
  LiveStats,
  Member,
  MemberImportResult,
  Paginated,
  Position,
  VoteStatus,
} from '@/types/api'

export type ImportResult = MemberImportResult

export const electionsApi = {
  list: () => apiGet<Paginated<Election>>('/elections/'),
  create: (name: string) => apiPost<Election>('/elections/', { name }),
  start: (id: number) => apiPost<Election>(`/elections/${id}/start/`),
  stop: (id: number) => apiPost<Election>(`/elections/${id}/stop/`),
  close: (id: number) => apiPost<Election>(`/elections/${id}/close/`),
  active: () => apiGet<Election | null>('/elections/active/'),
}

export const votesApi = {
  ballot: () => apiGet<Ballot>('/votes/ballot/'),
  submit: (position_id: number, candidate_id: number) =>
    apiPost('/votes/', { position_id, candidate_id }),
  myStatus: () => apiGet<VoteStatus>('/votes/my-status/'),
}

export const membersApi = {
  list: async () => {
    const { data } = await api.get<Paginated<Member>>('/members/')
    return data
  },
  import: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return apiUpload<MemberImportResult>('/members/import/', form)
  },
  remove: (id: number) => apiDelete(`/members/${id}/`),
  update: (id: number, payload: { cpm_number?: string; mc_number?: string; is_active?: boolean }) =>
    apiPatch<Member>(`/members/${id}/`, payload),
}

export const positionsApi = {
  list: () => apiGet<Paginated<Position>>('/positions/'),
  create: (name: string) => apiPost<Position>('/positions/', { name }),
  update: (id: number, name: string) => apiPatch<Position>(`/positions/${id}/`, { name }),
  remove: (id: number) => apiDelete(`/positions/${id}/`),
}

export const candidatesApi = {
  list: (position?: number) =>
    apiGet<Paginated<Candidate>>('/candidates/', position ? { position } : undefined),
  create: (payload: {
    full_name: string
    academic_year: string
    photo_url: string
    position: number
  }) => apiPost<Candidate>('/candidates/', payload),
  update: (
    id: number,
    payload: Partial<{
      full_name: string
      academic_year: string
      photo_url: string
      position: number
    }>,
  ) => apiPatch<Candidate>(`/candidates/${id}/`, payload),
  remove: (id: number) => apiDelete(`/candidates/${id}/`),
  uploadPhoto: (file: File) => {
    const form = new FormData()
    form.append('photo', file)
    return apiUpload<{ photo_url: string }>('/candidates/upload-photo/', form)
  },
}

export const dashboardApi = {
  summary: () => apiGet<DashboardSummary>('/dashboard/summary/'),
  liveStats: () => apiGet<LiveStats>('/dashboard/live-stats/'),
}

export const downloadReport = downloadReportFile
