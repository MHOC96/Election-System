import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = 'election_theme'
const THEME_SWITCH_MS = 320

/** Browser chrome colour — matches admin `--background` for each theme. */
const THEME_COLOR: Record<Theme, string> = {
  light: 'hsl(215 22% 97%)',
  dark: 'hsl(222 38% 7%)',
}

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function setThemeColorMeta(theme: Theme) {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"][data-dynamic]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    meta.dataset.dynamic = 'true'
    document.head.appendChild(meta)
  }
  meta.content = THEME_COLOR[theme]
}

function commitTheme(theme: Theme, instant: boolean) {
  const root = document.documentElement

  if (instant) root.classList.add('theme-transition-disabled')

  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
  localStorage.setItem(STORAGE_KEY, theme)
  setThemeColorMeta(theme)

  if (instant) {
    void root.offsetHeight
    requestAnimationFrame(() => {
      root.classList.remove('theme-transition-disabled')
    })
  }
}

/**
 * Applies the theme to <html>.
 *
 * First paint is instant (no animation). Later toggles use the View
 * Transitions API for a full-page cross-fade when available, otherwise a
 * synchronized CSS colour transition on every surface.
 */
function applyTheme(theme: Theme, animate: boolean) {
  if (!animate || prefersReducedMotion()) {
    commitTheme(theme, !animate)
    return
  }

  const root = document.documentElement

  if (typeof document.startViewTransition === 'function') {
    document.startViewTransition(() => {
      commitTheme(theme, true)
    })
    return
  }

  root.classList.add('theme-switching')
  commitTheme(theme, false)
  window.setTimeout(() => root.classList.remove('theme-switching'), THEME_SWITCH_MS)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)
  const hasMountedRef = useRef(false)
  const hasExplicitChoiceRef = useRef(localStorage.getItem(STORAGE_KEY) !== null)

  useEffect(() => {
    applyTheme(theme, hasMountedRef.current)
    hasMountedRef.current = true
  }, [theme])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (event: MediaQueryListEvent) => {
      if (hasExplicitChoiceRef.current) return
      setThemeState(event.matches ? 'dark' : 'light')
    }

    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  const setTheme = useCallback((next: Theme) => {
    hasExplicitChoiceRef.current = true
    setThemeState(next)
  }, [])

  const toggleTheme = useCallback(() => {
    hasExplicitChoiceRef.current = true
    setThemeState((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  const value = useMemo(
    () => ({ theme, toggleTheme, setTheme }),
    [theme, toggleTheme, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
