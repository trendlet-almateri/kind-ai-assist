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
    <div className="glass-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          {stats.map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <span className={`font-semibold text-sm ${s.color}`}>{s.value}</span>
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
        <Link
          href="/knowledge"
          className="text-xs text-primary hover:text-primary/80 transition-colors"
        >
          Manage →
        </Link>
      </div>
    </div>
  )
}
