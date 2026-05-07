import { redirect } from 'next/navigation'

/**
 * Root route — immediately redirect to /dashboard.
 * Middleware handles the auth check:
 *   - Unauthenticated → /login
 *   - Authenticated non-admin → /inbox
 *   - Authenticated admin → /dashboard (stays)
 */
export default function RootPage() {
  redirect('/dashboard')
}
