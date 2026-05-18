import Link from 'next/link'
import { Brain, CheckCircle2, Loader2, AlertCircle, ArrowRight } from 'lucide-react'

interface KnowledgeCounts {
  total: number
  ready: number
  processing: number
  failed: number
}

export function KnowledgeStrip({ counts }: { counts: KnowledgeCounts }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/50 px-4 py-3">
      {/* Icon + label */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Brain className="h-4 w-4 text-primary" />
      </div>
      <span className="text-xs font-semibold text-foreground shrink-0">Knowledge Base</span>

      <div className="mx-1 h-4 w-px bg-border/50 shrink-0" />

      {/* Stats */}
      <div className="flex flex-1 items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold tabular-nums text-foreground">{counts.total}</span>
          <span className="text-[11px] text-muted-foreground/50">Total</span>
        </div>

        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
          <span className="text-sm font-bold tabular-nums text-success">{counts.ready}</span>
          <span className="text-[11px] text-muted-foreground/50">Ready</span>
        </div>

        {counts.processing > 0 && (
          <div className="flex items-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 text-warning shrink-0 animate-spin" />
            <span className="text-sm font-bold tabular-nums text-warning">{counts.processing}</span>
            <span className="text-[11px] text-muted-foreground/50">Processing</span>
          </div>
        )}

        {counts.failed > 0 && (
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
            <span className="text-sm font-bold tabular-nums text-destructive">{counts.failed}</span>
            <span className="text-[11px] text-muted-foreground/50">Failed</span>
          </div>
        )}
      </div>

      {/* Manage link */}
      <Link
        href="/knowledge"
        className="flex shrink-0 items-center gap-1 rounded-lg border border-border/50 bg-accent/50 px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
      >
        Manage
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  )
}
