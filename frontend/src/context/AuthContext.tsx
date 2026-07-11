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
import { clearAuth, consumeFreshLogin, getAccessToken, getStoredUser } from '@/lib/auth-storage'
import type { User } from '@/types/api'
import { ForcePasswordChangeModal } from '@/components/auth/ForcePasswordChangeModal'

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
  const [isLoading, setIsLoading] = useState(() => Boolean(getAccessToken()))

  const refreshUser = useCallback(async () => {
    const token = getAccessToken()
    if (!token) {
      setUser(null)
      return
    }
    const me = await fetchMe()
    setUser(me)
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
    const loggedIn = await apiLogin(payload)
    setUser(loggedIn)
    setIsLoading(false)
    return loggedIn
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
