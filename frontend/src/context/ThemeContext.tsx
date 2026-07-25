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

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Browser chrome colour — matches `--portal-canvas` for each theme. */
const THEME_COLOR: Record<Theme, string> = {
  light: '#f1f4f9',
  dark: '#0b0e15',
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

/**
 * Applies the theme to <html>.
 *
 * On the first paint transitions are suppressed so the stored theme does
 * not animate in from the default. Every later switch keeps transitions
 * enabled, which lets the `--portal-fade` declarations on portal surfaces
 * cross-fade colours instead of snapping.
 */
function applyTheme(theme: Theme, animate: boolean) {
  const root = document.documentElement

  if (!animate) root.classList.add('theme-transition-disabled')

  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
  localStorage.setItem(STORAGE_KEY, theme)
  setThemeColorMeta(theme)

  if (!animate) {
    // Force a reflow so the class change is committed before transitions
    // are re-enabled, otherwise the removal batches with the paint.
    void root.offsetHeight
    requestAnimationFrame(() => {
      root.classList.remove('theme-transition-disabled')
    })
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)
  const hasMountedRef = useRef(false)
  // Read before the first `applyTheme` writes to storage, so we can tell a
  // saved preference apart from the value we are about to persist.
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
