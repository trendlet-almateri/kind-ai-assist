'use client'

import { useActionState } from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { loginAction } from '@/features/auth/actions'
import { cn } from '@/lib/utils'

const initialState = { error: undefined }

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState)

  return (
    <div className="flex min-h-screen">

      {/* ── Left panel — branding ─────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-[hsl(30_8%_8%)] relative overflow-hidden">

        {/* Subtle background glow */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-primary/8 blur-3xl" />

        {/* Logo */}
        <div className="relative flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
            <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.5)]" />
          </div>
          <span className="font-heading text-base tracking-tight text-foreground">SupportAI</span>
        </div>

        {/* Centre illustration */}
        <div className="relative flex flex-col items-center justify-center flex-1 py-12">
          {/* Circular chat illustration */}
          <div className="relative mb-10">
            <div className="h-56 w-56 rounded-full border border-border/30 bg-card/50 flex items-center justify-center">
              <div className="h-40 w-40 rounded-full border border-border/20 bg-card/80 flex items-center justify-center">
                <div className="space-y-2 px-4">
                  {/* Fake chat bubbles */}
                  <div className="h-3 w-24 rounded-full bg-primary/20" />
                  <div className="h-3 w-16 rounded-full bg-primary/30 ml-auto" />
                  <div className="h-3 w-20 rounded-full bg-primary/20" />
                </div>
              </div>
            </div>
            {/* Escalated badge */}
            <div className="absolute -top-2 left-8 flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-3 py-1">
              <div className="h-1.5 w-1.5 rounded-full bg-warning" />
              <span className="text-xs font-medium text-warning">Escalated</span>
            </div>
            {/* AI badge */}
            <div className="absolute -bottom-2 right-4 flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1">
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-medium text-primary">AI Active</span>
            </div>
          </div>

          {/* Headline */}
          <div className="text-center max-w-sm">
            <h1 className="font-heading text-4xl leading-tight text-foreground">
              Calm intelligence
              <br />
              <span className="text-primary">for support teams</span>
            </h1>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              Turn messy support chaos into clear, resolved conversations — powered by AI that never panics.
            </p>
          </div>
        </div>

        {/* Bottom tag */}
        <p className="relative text-xs text-muted-foreground/50 text-center">
          Secure · Private · Built for teams
        </p>
      </div>

      {/* ── Right panel — form ────────────────────────────────────────── */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
              <div className="h-3 w-3 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.5)]" />
            </div>
            <span className="font-heading text-xl">SupportAI</span>
          </div>

          {/* Desktop icon */}
          <div className="mb-8 hidden lg:flex justify-end">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
              <div className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.5)]" />
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="font-heading text-3xl tracking-tight">Welcome back</h2>
            <p className="mt-2 text-sm text-muted-foreground">Sign in to your workspace</p>
          </div>

          {/* Error banner */}
          {state?.error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-5 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {state.error}
            </motion.div>
          )}

          {/* Form */}
          <form action={formAction} className="space-y-4">
            {/* Email */}
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="Email"
              className={cn(
                'w-full rounded-2xl border border-border bg-card/60 px-4 py-3.5',
                'text-sm placeholder:text-muted-foreground/50',
                'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30',
                'transition-colors duration-150',
              )}
            />

            {/* Password */}
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="Password"
              className={cn(
                'w-full rounded-2xl border border-border bg-card/60 px-4 py-3.5',
                'text-sm placeholder:text-muted-foreground/50',
                'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30',
                'transition-colors duration-150',
              )}
            />

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              className={cn(
                'w-full flex items-center justify-center gap-2',
                'rounded-full bg-primary text-primary-foreground font-semibold text-sm',
                'py-3.5 mt-2 transition-all duration-200',
                'hover:bg-primary/90 hover:shadow-[0_0_24px_hsl(var(--primary)/0.3)]',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
