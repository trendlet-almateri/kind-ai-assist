'use client'

/**
 * components/providers/ThemeProvider.tsx — Client Component
 *
 * Wraps next-themes. Light is the default (signature Intercom look);
 * users can switch to the matched dark variant. The `.dark` class is
 * toggled on <html>, which flips the token block in globals.css.
 */

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ComponentProps } from 'react'

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
