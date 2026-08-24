'use client'

// Theme toggle — dark (default terminal) / light (institutional paper).
// Persisted to localStorage['trion-theme'], FOUC-safe via pre-hydration class.

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

type Theme = 'dark' | 'light'

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  return (localStorage.getItem('trion-theme') as Theme) === 'light' ? 'light' : 'dark'
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'light') root.classList.add('light')
  else root.classList.remove('light')
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = getStoredTheme()
    const t = setTimeout(() => {
      setTheme(stored)
      applyTheme(stored)
      setMounted(true)
    }, 0)
    return () => clearTimeout(t)
  }, [])

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    applyTheme(next)
    localStorage.setItem('trion-theme', next)
  }

  return (
    <button
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      className="rounded-md p-2 text-zinc-400 transition-colors hover:text-emerald-400"
    >
      {mounted ? (
        theme === 'dark'
          ? <Sun className="h-4 w-4" />
          : <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4 opacity-0" />
      )}
    </button>
  )
}

/** Inline script to prevent theme flash before hydration — put in <head>. */
export const themeInitScript = `
(function() {
  try {
    if (localStorage.getItem('trion-theme') === 'light') {
      document.documentElement.classList.add('light');
    }
  } catch (e) {}
})();
`
