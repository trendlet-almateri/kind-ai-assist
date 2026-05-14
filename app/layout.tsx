/**
 * app/layout.tsx — Root Layout (Server Component)
 *
 * WHY Server Component:
 * - Fonts load at the server level, no FOUT (flash of unstyled text).
 * - Metadata is static — no client JS needed.
 * - Only providers that need browser APIs are wrapped in a Client Component.
 */

import type { Metadata, Viewport } from 'next'
import { DM_Serif_Display, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { TitleGuard } from '@/components/providers/TitleGuard'
import './globals.css'

// ── Font loading ────────────────────────────────────────────────────────────
const dmSerifDisplay = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-heading',
  display: 'swap',
})

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-body',
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
  themeColor: '#151412',
}

// ── Root Layout ─────────────────────────────────────────────────────────────
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${dmSerifDisplay.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable} dark`}
      suppressHydrationWarning
    >
      <body className="font-body antialiased bg-background text-foreground">
        <QueryProvider>
          <TitleGuard />
          {children}
        </QueryProvider>
        {/* Toaster outside QueryProvider — works globally */}
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            style: {
              background: 'hsl(30 10% 11%)',
              border: '1px solid hsl(30 10% 16%)',
              color: 'hsl(38 14% 88%)',
            },
          }}
        />
      </body>
    </html>
  )
}
