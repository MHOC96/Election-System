import { apiDelete, apiGet, apiPatch, apiPost } from '@/api/client'
import type { Paginated, Position, AcademicYear } from '@/types/api'

function unwrapList<T>(data: Paginated<T> | T[]): T[] {
  return Array.isArray(data) ? data : data.results
}

export async function fetchPositions() {
  const data = await apiGet<Paginated<Position> | Position[]>('/positions/')
  return unwrapList(data)
}

export async function createPosition(name: string, academic_year?: AcademicYear | null, importance?: number) {
  return apiPost<Position>('/positions/', { name, academic_year, importance })
}

export async function updatePosition(id: number, name: string, academic_year?: AcademicYear | null, importance?: number) {
  return apiPatch<Position>(`/positions/${id}/`, { name, academic_year, importance })
}

export async function deletePosition(id: number) {
  return apiDelete(`/positions/${id}/`)
}
