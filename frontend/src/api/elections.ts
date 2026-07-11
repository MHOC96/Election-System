import { apiDelete, apiGet, apiPost, apiPatch } from '@/api/client'
import type { Election, Paginated, PublishedResults } from '@/types/api'

function unwrapList<T>(data: Paginated<T> | T[]): T[] {
  return Array.isArray(data) ? data : data.results
}

export async function fetchElections() {
  const data = await apiGet<Paginated<Election> | Election[]>('/elections/')
  return unwrapList(data)
}

export async function fetchOngoingElection() {
  return apiGet<Election | null>('/elections/ongoing/')
}

export async function fetchActiveElection() {
  return apiGet<Election | null>('/elections/active/')
}

export async function fetchDraftElection() {
  return apiGet<Election | null>('/elections/draft/')
}

export async function createElection(data: {
  name: string;
  application_start_at?: string;
  application_end_at?: string;
  voting_start_at?: string;
  voting_end_at?: string;
  require_all_positions_filled?: boolean;
}) {
  return apiPost<Election>('/elections/', data)
}

export async function updateElection(id: number, data: Partial<Election>) {
  return apiPatch<Election>(`/elections/${id}/`, data)
}

export async function scheduleElection(id: number) {
  return apiPost<Election>(`/elections/${id}/schedule/`)
}

export async function startVotingElection(id: number, voting_start_at?: string, voting_end_at?: string) {
  return apiPost<Election>(`/elections/${id}/start-voting/`, {
    ...(voting_start_at ? { voting_start_at } : {}),
    ...(voting_end_at ? { voting_end_at } : {}),
  })
}

export async function fetchPublishedResults() {
  return apiGet<PublishedResults | null>('/elections/published-results/')
}

export async function publishElectionResults(id: number) {
  return apiPost<Election>(`/elections/${id}/publish-results/`)
}

export async function archiveElection(id: number) {
  return apiPost<Election>(`/elections/${id}/archive/`)
}

export async function deleteElection(id: number) {
  return apiDelete(`/elections/${id}/`)
}
