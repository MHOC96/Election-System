import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import {
  clearAuth,
  getAccessToken,
  getRefreshToken,
  setAuthTokens,
  getStoredUser,
} from '@/lib/auth-storage'
import type { ApiFailure, ApiResponse } from '@/types/api'

const API_URL = import.meta.env.VITE_API_URL ?? '/api'

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
      window.location.href = '/login'
      return Promise.reject(error)
    }

    original.headers.Authorization = `Bearer ${newToken}`
    return api(original)
  },
)

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (axios.isAxiosError<ApiFailure>(error)) {
    const apiError = error.response?.data?.error
    if (apiError?.details && typeof apiError.details === 'object') {
      const fieldMessages = Object.entries(apiError.details).flatMap(([field, value]) => {
        if (Array.isArray(value)) {
          return value.map((item) => `${field}: ${String(item)}`)
        }
        return [`${field}: ${String(value)}`]
      })
      if (fieldMessages.length) return fieldMessages.join('; ')
    }
    if (apiError?.message) return apiError.message
    return error.message || fallback
  }
  if (error instanceof Error) return error.message
  return fallback
}

export async function apiGet<T>(url: string, params?: Record<string, unknown>) {
  const { data } = await api.get<ApiResponse<T>>(url, { params })
  if (!data.success) throw new Error(data.error.message)
  return data.data
}

export async function apiPost<T>(url: string, body?: unknown) {
  const { data } = await api.post<ApiResponse<T>>(url, body)
  if (!data.success) throw new Error(data.error.message)
  return data.data
}

export async function apiPatch<T>(url: string, body?: unknown) {
  const { data } = await api.patch<ApiResponse<T>>(url, body)
  if (!data.success) throw new Error(data.error.message)
  return data.data
}

export async function apiDelete(url: string) {
  const { data } = await api.delete<ApiResponse<unknown>>(url)
  if (!data.success) throw new Error(data.error.message)
}

export async function apiUpload<T>(url: string, formData: FormData) {
  const { data } = await api.post<ApiResponse<T>>(url, formData, {
    transformRequest: [(payload, headers) => {
      if (headers && typeof headers === 'object') {
        delete headers['Content-Type']
      }
      return payload
    }],
  })
  if (!data.success) throw new Error(data.error.message)
  return data.data
}

export async function downloadReport(
  type: 'results' | 'candidates' | 'turnout' | 'participation',
  format: 'csv' | 'xlsx' | 'pdf',
  electionId?: number,
) {
  const response = await api.get(`/reports/${type}/`, {
    params: { export_format: format, ...(electionId ? { election_id: electionId } : {}) },
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
