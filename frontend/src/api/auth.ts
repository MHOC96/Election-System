import axios from 'axios'
import { apiGet, apiPost, setLoggingOut } from '@/api/client'
import { clearAuth, getRefreshToken, markFreshLogin, setAuthTokens, setSessionMcHint } from '@/lib/auth-storage'
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

const API_URL = import.meta.env.VITE_API_URL ?? '/api'

export async function login(payload: LoginPayload): Promise<User> {
  const data = await apiPost<LoginResult>('/auth/login/', payload)
  setAuthTokens(data.access, data.refresh, data.user)
  setSessionMcHint(payload.mc_number)
  markFreshLogin()
  return data.user
}

export async function logout(): Promise<void> {
  setLoggingOut(true)
  const refresh = getRefreshToken()
  clearAuth()

  try {
    if (refresh) {
      await axios.post(`${API_URL}/auth/logout/`, { refresh }, {
        headers: { 'Content-Type': 'application/json' },
      })
    }
  } catch {
    // Local session is already cleared; server logout is best-effort.
  } finally {
    setLoggingOut(false)
  }
}

export async function fetchMe(): Promise<User> {
  return apiGet<User>('/auth/me/')
}

export async function refreshSession(): Promise<User> {
  return fetchMe()
}

export async function changePassword(payload: {
  current_password: string
  new_password: string
  confirm_password: string
}) {
  const refresh = getRefreshToken()
  const data = await apiPost<LoginResult>('/auth/change-password/', {
    ...payload,
    ...(refresh ? { refresh } : {}),
  })
  setAuthTokens(data.access, data.refresh, data.user)
  return data.user
}

export { api } from '@/api/client'
