/**
 * app/(auth)/layout.tsx — Auth Route Group Layout (Server Component)
 * Centered, minimal layout for login/forgot-password pages.
 */

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      {children}
    </main>
  )
}
