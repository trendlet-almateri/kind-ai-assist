'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, MinusCircle, RefreshCw, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { refreshIntegrationsHealthAction } from '@/features/settings/actions-health'
import type { IntegrationHealth, HealthStatus } from '@/server/integrations/health'

interface Props {
  initial: IntegrationHealth[]
}

const STATUS_META: Record<HealthStatus, { color: string; bg: string; Icon: typeof CheckCircle2; label: string }> = {
  ok:          { color: 'text-success',     bg: 'bg-success/10',     Icon: CheckCircle2,   label: 'connected' },
  missing:     { color: 'text-muted-foreground/70', bg: 'bg-muted/40',  Icon: MinusCircle,   label: 'not configured' },
  auth_failed: { color: 'text-destructive', bg: 'bg-destructive/10', Icon: XCircle,        label: 'auth failed' },
  error:       { color: 'text-warning',     bg: 'bg-warning/10',     Icon: AlertTriangle,  label: 'error' },
}

export function IntegrationsHealthPanel({ initial }: Props) {
  const [rows, setRows] = useState<IntegrationHealth[]>(initial)
  const [isPending, startTransition] = useTransition()
  const [lastChecked, setLastChecked] = useState<Date>(new Date())

  const handleRefresh = () => {
    startTransition(async () => {
      const result = await refreshIntegrationsHealthAction()
      if (result.data) {
        setRows(result.data)
        setLastChecked(new Date())
      }
    })
  }

  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/60 mb-1">
            Integrations
          </p>
          <p className="text-xs text-muted-foreground">
            Live health of external services this app depends on
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-lg border border-border/60 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Refresh
        </button>
      </div>

      {/* Rows */}
      <div className="space-y-2">
        {rows.map((row) => {
          const meta = STATUS_META[row.status]
          const { Icon } = meta
          return (
            <div
              key={row.service}
              className="flex items-start gap-3 rounded-xl border border-border/40 bg-background/40 px-3 py-3"
            >
              <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', meta.bg)}>
                <Icon className={cn('h-4 w-4', meta.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{row.label}</p>
                  <span className={cn('text-[10px] font-semibold uppercase tracking-wider', meta.color)}>
                    {meta.label}
                  </span>
                  {typeof row.latency_ms === 'number' && (
                    <span className="text-[10px] text-muted-foreground/60 tabular-nums">
                      {row.latency_ms} ms
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 break-words">{row.detail}</p>
                {row.fingerprint && (
                  <p className="font-mono text-[10px] text-muted-foreground/50 mt-1">
                    key: {row.fingerprint}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <p className="text-[10px] text-muted-foreground/50 mt-4">
        Last checked {lastChecked.toLocaleTimeString()} · key fingerprints show first 7 + last 4 chars only
      </p>
    </div>
  )
}
