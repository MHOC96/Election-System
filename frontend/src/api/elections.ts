import { apiDelete, apiGet, apiPost } from '@/api/client'
import type { Election, Paginated } from '@/types/api'

function unwrapList<T>(data: Paginated<T> | T[]): T[] {
  return Array.isArray(data) ? data : data.results
}

export async function fetchElections() {
  const data = await apiGet<Paginated<Election> | Election[]>('/elections/')
  return unwrapList(data)
}

export async function fetchActiveElection() {
  return apiGet<Election | null>('/elections/active/')
}

export async function createElection(name: string) {
  return apiPost<Election>('/elections/', { name })
}

export async function startElection(id: number) {
  return apiPost<Election>(`/elections/${id}/start/`)
}

export async function stopElection(id: number) {
  return apiPost<Election>(`/elections/${id}/stop/`)
}

export async function closeElection(id: number) {
  return apiPost<Election>(`/elections/${id}/close/`)
}

export async function deleteElection(id: number) {
  return apiDelete(`/elections/${id}/`)
}
