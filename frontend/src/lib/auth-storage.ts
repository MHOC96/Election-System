import type { User } from '@/types/api'

const ACCESS_KEY = 'election_access_token'
const REFRESH_KEY = 'election_refresh_token'
const USER_KEY = 'election_user'
const FRESH_LOGIN_KEY = 'election_fresh_login'

/** After login, avoid clearing the session on transient 401s from prefetch races. */
const LOGIN_GRACE_MS = 8_000

let loginAt = 0

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY)
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export function setAuthTokens(access: string, refresh: string, user: User) {
  localStorage.setItem(ACCESS_KEY, access)
  localStorage.setItem(REFRESH_KEY, refresh)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function markFreshLogin() {
  loginAt = Date.now()
  sessionStorage.setItem(FRESH_LOGIN_KEY, '1')
}

export function isLoginGracePeriod(): boolean {
  return loginAt > 0 && Date.now() - loginAt < LOGIN_GRACE_MS
}

export function consumeFreshLogin(): boolean {
  if (sessionStorage.getItem(FRESH_LOGIN_KEY) !== '1') {
    return false
  }
  sessionStorage.removeItem(FRESH_LOGIN_KEY)
  return true
}

export function clearAuth() {
  loginAt = 0
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(USER_KEY)
  sessionStorage.removeItem(FRESH_LOGIN_KEY)
}
