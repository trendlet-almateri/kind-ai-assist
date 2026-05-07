import Link from 'next/link'
import { AlertTriangle, Globe, MessageCircle } from 'lucide-react'
import { timeAgo } from '@/lib/utils'

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
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading text-base">Recent Escalations</h2>
        <Link
          href="/inbox?filter=needs_review"
          className="text-xs text-primary hover:text-primary/80 transition-colors"
        >
          View all →
        </Link>
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <AlertTriangle className="h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">No escalations</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((row) => (
            <Link
              key={row.id}
              href={`/inbox?id=${row.id}`}
              className="flex items-center gap-3 rounded-xl border border-border/50 bg-surface/50 px-4 py-3 hover:border-primary/30 hover:bg-surface transition-all duration-150"
            >
              {/* Channel icon */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning">
                {row.channel === 'whatsapp'
                  ? <MessageCircle className="h-4 w-4" />
                  : <Globe className="h-4 w-4" />
                }
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">
                  {row.customer_name ?? 'Unknown customer'}
                </p>
                {row.escalation_reason && (
                  <p className="truncate text-xs text-muted-foreground mt-0.5">
                    {row.escalation_reason}
                  </p>
                )}
              </div>

              {/* Time */}
              <span className="shrink-0 text-xs text-muted-foreground">
                {timeAgo(row.created_at)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
