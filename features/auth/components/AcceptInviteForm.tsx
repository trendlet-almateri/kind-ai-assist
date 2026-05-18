'use client'

/**
 * features/auth/components/AcceptInviteForm.tsx
 * Handles the full invite acceptance flow:
 *  1. Auto-verifies the OTP token from the URL (token_hash + type=invite)
 *  2. Prompts the invited user to set their password
 *  3. Calls server action to finalise cookies + redirect
 */

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/server/supabase/client'
import { completeInviteAction } from '@/features/auth/actions'
import { cn } from '@/lib/utils'

type Step = 'verifying' | 'set-password' | 'completing' | 'error'

export function AcceptInviteForm() {
  const searchParams = useSearchParams()
  const tokenHash   = searchParams.get('token_hash')
  const type        = searchParams.get('type')

  const [step,            setStep]            = useState<Step>('verifying')
  const [error,           setError]           = useState<string | null>(null)
  const [password,        setPassword]        = useState('')
  const [confirm,         setConfirm]         = useState('')
  const [showPass,        setShowPass]        = useState(false)
  const [showConfirm,     setShowConfirm]     = useState(false)
  const [isPending,       setIsPending]       = useState(false)

  // ── Step 1: verify invite token ──────────────────────────────────────────
  useEffect(() => {
    if (!tokenHash || type !== 'invite') {
      setError('Invalid or expired invite link. Ask your admin to send a new one.')
      setStep('error')
      return
    }

    const supabase = getSupabaseBrowserClient()
    supabase.auth
      .verifyOtp({ token_hash: tokenHash, type: 'invite' })
      .then(({ error: err }) => {
        if (err) {
          setError(err.message.includes('expired')
            ? 'This invite link has expired. Ask your admin to send a new one.'
            : err.message
          )
          setStep('error')
        } else {
          setStep('set-password')
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Step 2: set password ─────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setIsPending(true)

    const supabase = getSupabaseBrowserClient()
    const { error: updateErr } = await supabase.auth.updateUser({ password })

    if (updateErr) {
      setError(updateErr.message)
      setIsPending(false)
      return
    }

    // ── Step 3: finalise session on server + redirect ──────────────────────
    setStep('completing')
    await completeInviteAction()
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
            <div className="h-3 w-3 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.5)]" />
          </div>
          <h2 className="font-heading text-3xl tracking-tight">
            {step === 'error' ? 'Invite error' : 'Set your password'}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {step === 'verifying'   && 'Verifying your invite…'}
            {step === 'set-password'&& 'Choose a secure password to activate your account'}
            {step === 'completing'  && 'Setting up your account…'}
            {step === 'error'       && 'Something went wrong with this invite link'}
          </p>
        </div>

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-5 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Verifying spinner */}
        {(step === 'verifying' || step === 'completing') && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
          </div>
        )}

        {/* Set-password form */}
        {step === 'set-password' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Password */}
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password"
                required
                autoFocus
                autoComplete="new-password"
                className={cn(
                  'w-full rounded-2xl border border-border bg-card/60 px-4 py-3.5 pr-11',
                  'text-sm placeholder:text-muted-foreground/50',
                  'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30',
                  'transition-colors duration-150',
                )}
              />
              <button
                type="button"
                onClick={() => setShowPass((p) => !p)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Confirm password */}
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm password"
                required
                autoComplete="new-password"
                className={cn(
                  'w-full rounded-2xl border border-border bg-card/60 px-4 py-3.5 pr-11',
                  'text-sm placeholder:text-muted-foreground/50',
                  'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30',
                  'transition-colors duration-150',
                )}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((p) => !p)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Password strength hint */}
            <p className="text-[11px] text-muted-foreground/50 px-1">
              Minimum 8 characters
            </p>

            <div className="flex justify-center pt-2">
              <button
                type="submit"
                disabled={isPending}
                className={cn(
                  'flex items-center justify-center gap-2',
                  'rounded-full bg-primary text-primary-foreground font-semibold text-sm',
                  'px-10 py-3.5 transition-all duration-200',
                  'hover:bg-primary/90 hover:shadow-[0_0_24px_hsl(var(--primary)/0.3)]',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                {isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Activating…</>
                ) : (
                  <><ShieldCheck className="h-4 w-4" /> Activate account</>
                )}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  )
}
