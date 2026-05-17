import Link from 'next/link'
import { BookOpen, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'

interface KnowledgeCounts {
  total: number
  ready: number
  processing: number
  failed: number
}

export function KnowledgeStrip({ counts }: { counts: KnowledgeCounts }) {
  const stats = [
    { label: 'Total',      value: counts.total,      color: 'text-foreground',          icon: BookOpen     },
    { label: 'Ready',      value: counts.ready,      color: 'text-success',             icon: CheckCircle2 },
    { label: 'Processing', value: counts.processing, color: 'text-warning',             icon: Loader2      },
    { label: 'Failed',     value: counts.failed,     color: 'text-destructive',         icon: AlertCircle  },
  ]

  return (
    <div className="flex items-center justify-between rounded-lg border border-border/50 bg-card/50 px-4 py-2.5">
      <div className="flex items-center gap-1">
        <span className="mr-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
          Knowledge
        </span>
        {stats.map((s, i) => (
          <div key={s.label} className="flex items-center gap-1.5">
            {i > 0 && <span className="mx-2 text-border/60">·</span>}
            <s.icon className={`h-3 w-3 shrink-0 ${s.color}`} />
            <span className={`text-xs font-semibold tabular-nums ${s.color}`}>{s.value}</span>
            <span className="text-[11px] text-muted-foreground/50">{s.label}</span>
          </div>
        ))}
      </div>
      <Link
        href="/knowledge"
        className="text-[11px] text-muted-foreground/60 hover:text-foreground transition-colors shrink-0"
      >
        Manage →
      </Link>
    </div>
  )
}
