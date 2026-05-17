import Link from 'next/link'
import { AlertTriangle, Globe, MessageCircle } from 'lucide-react'
import { cn, timeAgo } from '@/lib/utils'

interface EscalationRow {
  id: string
  customer_name: string | null
  escalation_reason: string | null
  channel: 'web' | 'whatsapp'
  created_at: string
}

interface EscalationsTableProps {
  data: EscalationRow[]
}

export function EscalationsTable({ data }: EscalationsTableProps) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Recent Escalations</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground/60">{data.length} requiring attention</p>
        </div>
        <Link
          href="/inbox?filter=needs_review"
          className="text-[11px] text-muted-foreground/60 hover:text-foreground transition-colors"
        >
          View all →
        </Link>
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <AlertTriangle className="h-6 w-6 text-muted-foreground/20 mb-2" />
          <p className="text-xs text-muted-foreground/50">No escalations</p>
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {data.map((row) => (
            <Link
              key={row.id}
              href={`/inbox?id=${row.id}`}
              className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 group hover:opacity-80 transition-opacity duration-100"
            >
              {/* Channel icon */}
              <div className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                row.channel === 'whatsapp' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
              )}>
                {row.channel === 'whatsapp'
                  ? <MessageCircle className="h-3.5 w-3.5" />
                  : <Globe className="h-3.5 w-3.5" />
                }
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium leading-snug">
                  {row.customer_name ?? 'Unknown customer'}
                </p>
                {row.escalation_reason && (
                  <p className="truncate text-[11px] text-muted-foreground/60 mt-0.5">
                    {row.escalation_reason}
                  </p>
                )}
              </div>

              {/* Time */}
              <span className="shrink-0 text-[11px] text-muted-foreground/40 tabular-nums">
                {timeAgo(row.created_at)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
