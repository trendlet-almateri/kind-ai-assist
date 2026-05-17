'use client'

/**
 * components/layout/ThemeToggle.tsx — Client Component
 *
 * Sun/moon toggle for the sidebar footer. Mounted-guarded to avoid a
 * hydration mismatch (server can't know the resolved theme). Icon
 * cross-fades; button scales on press for tactile feedback.
 */

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle({ collapsed }: { collapsed: boolean }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = resolvedTheme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="flex h-8 w-8 items-center justify-center rounded-xl text-metadata transition-[color,background-color,transform] duration-150 ease-out hover:bg-accent hover:text-foreground active:scale-95"
      title={isDark ? 'Switch to light' : 'Switch to dark'}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {/* Icons cross-fade; render both only after mount to avoid SSR mismatch */}
      <span className="relative h-4 w-4">
        <Sun
          className={`absolute inset-0 h-4 w-4 transition-opacity duration-200 ease-out ${
            mounted && !isDark ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <Moon
          className={`absolute inset-0 h-4 w-4 transition-opacity duration-200 ease-out ${
            mounted && isDark ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </span>
    </button>
  )
}
