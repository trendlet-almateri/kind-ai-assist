'use client'

/**
 * components/providers/ThemedToaster.tsx — Client Component
 *
 * Sonner toaster that follows the active next-themes theme and reads
 * its colors from CSS tokens, so it stays correct in both light and dark.
 */

import { Toaster } from 'sonner'
import { useTheme } from 'next-themes'

export function ThemedToaster() {
  const { resolvedTheme } = useTheme()

  return (
    <Toaster
      position="bottom-right"
      theme={(resolvedTheme as 'light' | 'dark') ?? 'light'}
      toastOptions={{
        style: {
          background: 'hsl(var(--popover))',
          border: '1px solid hsl(var(--border))',
          color: 'hsl(var(--popover-foreground))',
        },
      }}
    />
  )
}
