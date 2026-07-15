import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { fetchMe, login as apiLogin, logout as apiLogout, type LoginPayload } from '@/api/auth'
import { clearAuth, consumeFreshLogin, getAccessToken, getRefreshToken, getStoredUser, setAuthTokens } from '@/lib/auth-storage'
import type { User } from '@/types/api'
import { ForcePasswordChangeModal } from '@/components/auth/ForcePasswordChangeModal'

function getInitialAuthLoading(): boolean {
  const token = getAccessToken()
  if (!token) return false
  // Cached profile is enough to render the shell; validate token in the background.
  return !getStoredUser()
}

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (payload: LoginPayload) => Promise<User>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser())
  const [isLoading, setIsLoading] = useState(getInitialAuthLoading)

  const refreshUser = useCallback(async () => {
    const token = getAccessToken()
    const refresh = getRefreshToken()
    if (!token) {
      setUser(null)
      return
    }
    const me = await fetchMe()
    setUser(me)
    if (refresh) {
      setAuthTokens(token, refresh, me)
    }
  }, [])

  useEffect(() => {
    const token = getAccessToken()
    if (!token) {
      if (getStoredUser()) clearAuth()
      setUser(null)
      setIsLoading(false)
      return
    }

    if (consumeFreshLogin()) {
      setIsLoading(false)
      return
    }

    void refreshUser()
      .catch(() => {
        clearAuth()
        setUser(null)
      })
      .finally(() => setIsLoading(false))
  }, [refreshUser])

  const login = useCallback(async (payload: LoginPayload) => {
    await apiLogin(payload)
    let profile: User | null = getStoredUser()
    if (profile?.role === 'MEMBER') {
      profile = await fetchMe()
      const access = getAccessToken()
      const refresh = getRefreshToken()
      if (access && refresh) {
        setAuthTokens(access, refresh, profile)
      }
    }
    setUser(profile)
    setIsLoading(false)
    return profile!
  }, [])

  const logout = useCallback(async () => {
    setUser(null)
    setIsLoading(false)
    await apiLogout()
  }, [])

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      logout,
      refreshUser,
    }),
    [user, isLoading, login, logout, refreshUser],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
      {user && user.role === 'MEMBER' && !user.has_changed_password && !isLoading && (
        <ForcePasswordChangeModal
          open={true}
          onSuccess={async () => {
            await refreshUser()
          }}
        />
      )}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
