/**
 * app/(auth)/login/page.tsx — Server Component
 * Renders the login form. No data fetching needed here.
 */

import type { Metadata } from 'next'
import { LoginForm } from '@/features/auth/components/LoginForm'

export const metadata: Metadata = {
  title: 'Sign In',
}

export default function LoginPage() {
  return <LoginForm />
}
