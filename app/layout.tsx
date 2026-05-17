/**
 * app/layout.tsx — Root Layout (Server Component)
 *
 * WHY Server Component:
 * - Fonts load at the server level, no FOUT (flash of unstyled text).
 * - Metadata is static — no client JS needed.
 * - Only providers that need browser APIs are wrapped in Client Components.
 *
 * Theme: Intercom. Light is the default; next-themes toggles a matched
 * dark variant by adding `.dark` to <html>.
 */

import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { ThemedToaster } from '@/components/providers/ThemedToaster'
import { TitleGuard } from '@/components/providers/TitleGuard'
import './globals.css'

// ── Font loading ────────────────────────────────────────────────────────────
// Inter covers headings + body (clean Intercom-style sans). One family,
// two CSS vars so existing font-heading / font-body utilities keep working.
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

const interHeading = Inter({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-heading',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

// ── Metadata ────────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: {
    default: 'SupportAI',
    template: '%s | SupportAI',
  },
  description: 'AI-powered customer support platform',
  robots: { index: false, follow: false }, // internal tool — no indexing
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#F7F8FA',
}

// ── Root Layout ─────────────────────────────────────────────────────────────
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${interHeading.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="font-body antialiased bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <TitleGuard />
            {children}
          </QueryProvider>
          {/* Toaster outside QueryProvider — works globally */}
          <ThemedToaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
