'use client'

import { useActionState } from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { loginAction } from '@/features/auth/actions'
import { cn } from '@/lib/utils'

const initialState = { error: undefined }

// Floating chat bubble data for left panel animation
const bubbles = [
  { id: 1, text: 'How do I track my order?',      align: 'left',  delay: 0,    y: 0   },
  { id: 2, text: 'Your order ships tomorrow! 📦', align: 'right', delay: 0.6,  y: 0   },
  { id: 3, text: 'Can I get a refund?',            align: 'left',  delay: 1.2,  y: 0   },
  { id: 4, text: 'Resolved in 2 min ✓',           align: 'right', delay: 1.8,  y: 0   },
]

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState)

  return (
    <div className="flex min-h-screen">

      {/* ── Left panel — animated branding ───────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 bg-[hsl(30_8%_7%)] relative overflow-hidden">

        {/* Background glows */}
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 right-0 h-80 w-80 rounded-full bg-primary/6 blur-3xl pointer-events-none" />

        <div className="relative w-full max-w-md">

          {/* Floating circle illustration */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="flex justify-center mb-10"
          >
            <div className="relative h-52 w-52">
              {/* Outer ring */}
              <div className="absolute inset-0 rounded-full border border-border/25" />
              {/* Inner ring */}
              <div className="absolute inset-6 rounded-full border border-border/20 bg-card/40 backdrop-blur-sm flex items-center justify-center">
                {/* Chat bubbles inside circle */}
                <div className="space-y-2 px-4 w-full">
                  <motion.div
                    animate={{ scaleX: [0.7, 1, 0.7] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0 }}
                    className="h-2.5 w-20 rounded-full bg-primary/30 origin-left"
                  />
                  <motion.div
                    animate={{ scaleX: [1, 0.75, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                    className="h-2.5 w-14 rounded-full bg-primary/20 ml-auto origin-right"
                  />
                  <motion.div
                    animate={{ scaleX: [0.8, 1, 0.8] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                    className="h-2.5 w-16 rounded-full bg-primary/30 origin-left"
                  />
                </div>
              </div>

            </div>
          </motion.div>

          {/* Animated chat bubbles */}
          <div className="space-y-3 mb-10">
            {bubbles.map((b) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, x: b.align === 'left' ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: b.delay, duration: 0.5, ease: 'easeOut' }}
                className={cn('flex', b.align === 'right' ? 'justify-end' : 'justify-start')}
              >
                <span className={cn(
                  'rounded-2xl px-4 py-2 text-sm',
                  b.align === 'left'
                    ? 'bg-card/70 border border-border/40 text-foreground/80 rounded-tl-sm'
                    : 'bg-primary/15 border border-primary/20 text-primary rounded-tr-sm'
                )}>
                  {b.text}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.2, duration: 0.6 }}
            className="text-center"
          >
            <h1 className="font-heading text-3xl leading-tight text-foreground">
              Calm intelligence
              <br />
              <span className="text-primary">for support teams</span>
            </h1>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Turn messy support chaos into clear, resolved conversations —<br />
              powered by AI that never panics.
            </p>
          </motion.div>
        </div>
      </div>

      {/* ── Right panel — form ────────────────────────────────────────── */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          {/* Logo + heading — centered */}
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
              <div className="h-3 w-3 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.5)]" />
            </div>
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

            <div className="flex justify-center mt-2">
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
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
