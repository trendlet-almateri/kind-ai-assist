'use client'

import { useActionState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Lock, Mail } from 'lucide-react'
import { loginAction } from '@/features/auth/actions'
import { cn } from '@/lib/utils'

const initialState = { error: undefined }

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-sm"
    >
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
          <div className="h-3 w-3 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.5)]" />
        </div>
        <div className="text-center">
          <h1 className="font-heading text-2xl tracking-tight">SupportAI</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your workspace</p>
        </div>
      </div>

      {/* Form */}
      <form action={formAction} className="glass-card space-y-4 p-6">
        {/* Error banner */}
        {state?.error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {state.error}
          </motion.div>
        )}

        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@company.com"
              className={cn(
                'w-full rounded-xl border border-border bg-input pl-10 pr-4 py-2.5',
                'text-sm placeholder:text-muted-foreground/50',
                'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40',
                'transition-colors duration-150',
              )}
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className={cn(
                'w-full rounded-xl border border-border bg-input pl-10 pr-4 py-2.5',
                'text-sm placeholder:text-muted-foreground/50',
                'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40',
                'transition-colors duration-150',
              )}
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending}
          className={cn(
            'w-full flex items-center justify-center gap-2 rounded-xl',
            'bg-primary text-primary-foreground font-semibold text-sm',
            'py-2.5 transition-all duration-200',
            'hover:bg-primary/90 hover:shadow-[0_0_20px_hsl(var(--primary)/0.25)]',
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

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Contact your administrator to get access.
      </p>
    </motion.div>
  )
}
