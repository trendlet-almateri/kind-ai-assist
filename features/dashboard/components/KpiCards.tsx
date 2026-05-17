'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Bot, MessageSquare, Zap, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { KpiData, PeriodValues } from '@/types'

type Period = 'day' | 'week' | 'month'

function getChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

function getValue(vals: PeriodValues, period: Period): number {
  return vals[period]
}

function getPrev(vals: PeriodValues, period: Period): number {
  return vals[`prev${period.charAt(0).toUpperCase() + period.slice(1)}` as keyof PeriodValues] as number
}

interface KpiCardProps {
  label: string
  icon: React.ElementType
  values: PeriodValues
  period: Period
  format?: (n: number) => string
  accent?: string
}

function KpiCard({ label, icon: Icon, values, period, format, accent }: KpiCardProps) {
  const value    = getValue(values, period)
  const prev     = getPrev(values, period)
  const change   = getChange(value, prev)
  const isUp     = change >= 0
  const display  = format ? format(value) : value.toLocaleString()

  return (
    <div className="stat-card !p-5">
      <div className="flex items-start justify-between">
        <div className={cn(
          'flex h-8 w-8 items-center justify-center rounded-md',
          accent ?? 'bg-primary/10 text-primary'
        )}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className={cn(
          'text-[11px] font-medium tabular-nums',
          isUp ? 'text-success' : 'text-destructive'
        )}>
          {isUp ? '+' : ''}{change}%
        </span>
      </div>

      <div className="mt-5">
        <p className="text-2xl font-semibold tracking-tight text-foreground">{display}</p>
        <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">{label}</p>
      </div>
    </div>
  )
}

interface KpiCardsProps {
  data: KpiData
}

export function KpiCards({ data }: KpiCardsProps) {
  const [period, setPeriod] = useState<Period>('day')

  const periods: { key: Period; label: string }[] = [
    { key: 'day',   label: 'Today' },
    { key: 'week',  label: '7 days' },
    { key: 'month', label: '30 days' },
  ]

  return (
    <div>
      {/* Period toggle */}
      <div className="mb-3 flex items-center gap-0.5 rounded-lg border border-border/50 bg-card/60 p-0.5 w-fit">
        {periods.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={cn(
              'rounded-md px-3 py-1.5 text-[11px] font-medium transition-all duration-150',
              period === p.key
                ? 'bg-accent text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Conversations"
          icon={MessageSquare}
          values={data.conversations}
          period={period}
        />
        <KpiCard
          label="AI Resolution Rate"
          icon={Bot}
          values={data.aiResolutionRate}
          period={period}
          format={(n) => `${n}%`}
          accent="bg-success/10 text-success"
        />
        <KpiCard
          label="Tokens Used"
          icon={Zap}
          values={data.totalTokensUsed}
          period={period}
          format={(n) => n > 999 ? `${(n / 1000).toFixed(1)}k` : String(n)}
          accent="bg-chart-blue/10 text-chart-blue"
        />
        {/* Escalations — uses its own data shape */}
        <div className="stat-card !p-5">
          <div className="flex items-start justify-between">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-warning/10 text-warning">
              <AlertTriangle className="h-3.5 w-3.5" />
            </div>
            <span className={cn(
              'text-[11px] font-medium',
              data.escalationsToday > data.escalationsYesterday ? 'text-destructive' : 'text-success'
            )}>
              vs yesterday
            </span>
          </div>
          <div className="mt-5">
            <p className="text-2xl font-semibold tracking-tight text-foreground">{data.escalationsToday}</p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">Escalations Today</p>
          </div>
        </div>
      </div>
    </div>
  )
}
