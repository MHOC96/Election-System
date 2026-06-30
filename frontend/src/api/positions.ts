import { apiDelete, apiGet, apiPatch, apiPost } from '@/api/client'
import type { Paginated, Position } from '@/types/api'

function unwrapList<T>(data: Paginated<T> | T[]): T[] {
  return Array.isArray(data) ? data : data.results
}

export async function fetchPositions() {
  const data = await apiGet<Paginated<Position> | Position[]>('/positions/')
  return unwrapList(data)
}

export async function createPosition(name: string) {
  return apiPost<Position>('/positions/', { name })
}

export async function updatePosition(id: number, name: string) {
  return apiPatch<Position>(`/positions/${id}/`, { name })
}

export async function deletePosition(id: number) {
  return apiDelete(`/positions/${id}/`)
}
