'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts'
import type { DailyConversations, StatusBreakdown } from '@/types'

// ── Shared tooltip style ─────────────────────────────────────────────────────
const tooltipStyle = {
  backgroundColor: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '0.75rem',
  color: 'hsl(var(--popover-foreground))',
  fontSize: 12,
}

// ── Conversations Over Time (stacked bar) ────────────────────────────────────
interface ConversationsChartProps {
  data: DailyConversations[]
}

export function ConversationsChart({ data }: ConversationsChartProps) {
  return (
    <div className="glass-card p-6">
      <h2 className="font-heading text-base mb-4">Conversations (7 days)</h2>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barSize={28} barGap={4}>
          <XAxis
            dataKey="label"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: 'hsl(var(--muted))' }}
          />
          <Bar dataKey="aiHandled" name="AI Handled" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 4, 4]} />
          <Bar dataKey="agentHandled" name="Agent Handled" stackId="a" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Status Donut ─────────────────────────────────────────────────────────────
interface StatusDonutProps {
  data: StatusBreakdown[]
}

export function StatusDonut({ data }: StatusDonutProps) {
  return (
    <div className="glass-card p-6">
      <h2 className="font-heading text-base mb-4">Status Breakdown</h2>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="status"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={3}
          >
            {data.map((entry) => (
              <Cell key={entry.status} fill={entry.color} />
            ))}
          </Pie>
          <Legend
            formatter={(value) => (
              <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: 11 }}>
                {value ? value.charAt(0).toUpperCase() + value.slice(1) : ''}
              </span>
            )}
          />
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
