const ACCESS_KEY = 'election_access_token'
const REFRESH_KEY = 'election_refresh_token'
const USER_KEY = 'election_user'
const FRESH_LOGIN_KEY = 'election_fresh_login'
const MC_HINT_KEY = 'election_mc_hint'

export interface StoredUser {
  id: number
  cpm_number: string
  role: 'ADMIN' | 'MEMBER'
  is_active: boolean
  has_changed_password: boolean
  created_at: string
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY)
}

export function getStoredUser(): StoredUser | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredUser
  } catch {
    return null
  }
}

export function setAuthTokens(access: string, refresh: string, user: StoredUser) {
  localStorage.setItem(ACCESS_KEY, access)
  localStorage.setItem(REFRESH_KEY, refresh)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function markFreshLogin() {
  sessionStorage.setItem(FRESH_LOGIN_KEY, '1')
}

export function consumeFreshLogin(): boolean {
  if (sessionStorage.getItem(FRESH_LOGIN_KEY) !== '1') {
    return false
  }
  sessionStorage.removeItem(FRESH_LOGIN_KEY)
  return true
}

export function setSessionMcHint(mcNumber: string) {
  if (!mcNumber.trim()) return
  sessionStorage.setItem(MC_HINT_KEY, mcNumber.trim())
}

export function getSessionMcHint(): string | null {
  return sessionStorage.getItem(MC_HINT_KEY)
}

export function clearSessionMcHint() {
  sessionStorage.removeItem(MC_HINT_KEY)
}

export function clearAuth() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(USER_KEY)
  sessionStorage.removeItem(FRESH_LOGIN_KEY)
  clearSessionMcHint()
}
