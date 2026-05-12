/**
 * app/(auth)/layout.tsx — Auth Route Group Layout (Server Component)
 * Centered, minimal layout for login/forgot-password pages.
 */

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background">
      {children}
    </main>
  )
}
