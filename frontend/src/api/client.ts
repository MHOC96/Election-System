import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { formatUserMessage, resolveApiUserMessage, type ApiErrorContext } from '@/lib/user-messages'
import {
  clearAuth,
  getAccessToken,
  getRefreshToken,
  setAuthTokens,
  getStoredUser,
} from '@/lib/auth-storage'
import { dispatchAuthSessionExpired } from '@/lib/auth-events'
import type { ApiFailure, ApiResponse } from '@/types/api'

const API_URL = import.meta.env.VITE_API_URL ?? '/api'

if (import.meta.env.PROD && API_URL.startsWith('/')) {
  console.error(
    '[API] VITE_API_URL is relative (%s). Set it in Vercel to your Render URL, e.g. https://your-service.onrender.com/api',
    API_URL,
  )
}

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

let refreshPromise: Promise<string | null> | null = null
let loggingOut = false

export function isLoggingOut(): boolean {
  return loggingOut
}

export function setLoggingOut(value: boolean): void {
  loggingOut = value
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken()
  if (!refresh) return null

  try {
    const { data } = await axios.post<ApiResponse<{ access: string; refresh?: string }>>(
      `${API_URL}/auth/refresh/`,
      { refresh },
    )
    if (!data.success) return null

    const user = getStoredUser()
    if (!user) return null

    const newRefresh = data.data.refresh ?? refresh
    setAuthTokens(data.data.access, newRefresh, user)
    return data.data.access
  } catch {
    return null
  }
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiFailure>) => {
    const original = error.config
    if (!original || error.response?.status !== 401) {
      return Promise.reject(error)
    }

    if (loggingOut || original.url?.includes('/auth/logout')) {
      return Promise.reject(error)
    }

    if (original.url?.includes('/auth/login') || original.url?.includes('/auth/refresh')) {
      return Promise.reject(error)
    }

    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null
      })
    }

    const newToken = await refreshPromise
    if (!newToken) {
      clearAuth()
      dispatchAuthSessionExpired()
      return Promise.reject(error)
    }

    original.headers.Authorization = `Bearer ${newToken}`
    return api(original)
  },
)

function unwrapApiResponse<T>(response: ApiResponse<T>): T {
  if (response.success === false) {
    throw new Error(response.error.message)
  }
  return response.data
}

export function getApiErrorMessage(
  error: unknown,
  context: ApiErrorContext = 'general',
): string {
  return formatUserMessage(resolveApiUserMessage(error, context))
}

export async function apiGet<T>(url: string, params?: Record<string, unknown>) {
  const { data } = await api.get<ApiResponse<T>>(url, { params })
  return unwrapApiResponse(data)
}

export async function apiPost<T>(url: string, body?: unknown) {
  const { data } = await api.post<ApiResponse<T>>(url, body)
  return unwrapApiResponse(data)
}

export async function apiPatch<T>(url: string, body?: unknown) {
  const { data } = await api.patch<ApiResponse<T>>(url, body)
  return unwrapApiResponse(data)
}

export async function apiDelete(url: string) {
  const { data } = await api.delete<ApiResponse<unknown>>(url)
  unwrapApiResponse(data)
}

export async function apiUpload<T>(url: string, formData: FormData) {
  const { data } = await api.post<ApiResponse<T>>(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return unwrapApiResponse(data)
}

export async function downloadReport(
  type: 'results' | 'candidates' | 'turnout' | 'participation',
  format: 'csv' | 'xlsx' | 'pdf',
  electionId?: number,
  academicYear?: string,
) {
  const params: Record<string, string | number> = { export_format: format }
  if (electionId) params.election_id = electionId
  if (academicYear) params.academic_year = academicYear

  const response = await api.get(`/reports/${type}/`, {
    params,
    responseType: 'blob',
  })

  const disposition = response.headers['content-disposition'] as string | undefined
  const match = disposition?.match(/filename="?([^"]+)"?/)
  const filename = match?.[1] ?? `${type}-report.${format}`

  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
