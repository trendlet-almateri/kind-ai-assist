'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from 'recharts'
import type { DailyConversations, StatusBreakdown } from '@/types'

// ── Shared tooltip style ─────────────────────────────────────────────────────
const tooltipStyle = {
  backgroundColor: 'hsl(30 10% 11%)',
  border: '1px solid hsl(30 10% 16%)',
  borderRadius: '0.75rem',
  color: 'hsl(38 14% 88%)',
  fontSize: 12,
}

// ── Conversations Over Time (stacked bar) ────────────────────────────────────
interface ConversationsChartProps {
  data: DailyConversations[]
}

export function ConversationsChart({ data }: ConversationsChartProps) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/60 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Conversations</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground/60">Last 7 days</p>
        </div>
        <div className="flex items-center gap-4">
          {[
            { color: 'hsl(164 56% 53%)', label: 'AI' },
            { color: 'hsl(220 81% 65%)', label: 'Agent' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: l.color }} />
              <span className="text-[11px] text-muted-foreground/60">{l.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="w-full overflow-hidden">
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} barSize={22} barCategoryGap="35%">
          <XAxis
            dataKey="label"
            tick={{ fill: 'hsl(35 8% 40%)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'hsl(35 8% 40%)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: 'hsl(30 8% 13%)' }}
          />
          <Bar dataKey="aiHandled"    name="AI Handled"    stackId="a" fill="hsl(164 56% 53%)" radius={[0, 0, 3, 3]} />
          <Bar dataKey="agentHandled" name="Agent Handled" stackId="a" fill="hsl(220 81% 65%)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      </div>
    </div>
  )
}

// ── Status Donut ─────────────────────────────────────────────────────────────
interface StatusDonutProps {
  data: StatusBreakdown[]
}

export function StatusDonut({ data }: StatusDonutProps) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/60 p-5">
      <div className="mb-2">
        <h2 className="text-sm font-semibold tracking-tight">Status</h2>
        <p className="mt-0.5 text-[11px] text-muted-foreground/60">Breakdown</p>
      </div>
      <div className="w-full overflow-hidden">
      <ResponsiveContainer width="100%" height={140}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="status"
            cx="50%"
            cy="50%"
            innerRadius={42}
            outerRadius={62}
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((entry) => (
              <Cell key={entry.status} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-y-1.5 gap-x-3">
        {data.map((entry) => (
          <div key={entry.status} className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: entry.color }} />
            <span className="text-[11px] capitalize text-muted-foreground/60 flex-1">{entry.status}</span>
            <span className="text-[11px] font-medium tabular-nums text-muted-foreground">{entry.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
