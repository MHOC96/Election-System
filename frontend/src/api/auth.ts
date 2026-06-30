import { api, apiGet, apiPost } from '@/api/client'
import { clearAuth, setAuthTokens } from '@/lib/auth-storage'
import type { User } from '@/types/api'

export interface LoginPayload {
  cpm_number: string
  mc_number: string
}

export interface LoginResult {
  access: string
  refresh: string
  user: User
}

export async function login(payload: LoginPayload): Promise<User> {
  const data = await apiPost<LoginResult>('/auth/login/', payload)
  setAuthTokens(data.access, data.refresh, data.user)
  return data.user
}

export async function logout(): Promise<void> {
  const refresh = localStorage.getItem('election_refresh_token')
  try {
    if (refresh) {
      await apiPost('/auth/logout/', { refresh })
    }
  } finally {
    clearAuth()
  }
}

export async function fetchMe(): Promise<User> {
  return apiGet<User>('/auth/me/')
}

export async function refreshSession(): Promise<User> {
  return fetchMe()
}

export { api }
