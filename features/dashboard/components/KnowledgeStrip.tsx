import Link from 'next/link'
import { Brain, CheckCircle2, Loader2, AlertCircle, FileText } from 'lucide-react'

interface KnowledgeCounts {
  total: number
  ready: number
  processing: number
  failed: number
}

export function KnowledgeStrip({ counts }: { counts: KnowledgeCounts }) {
  return (
    <div className="rounded-xl border border-border/40 bg-card/50 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Brain className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">Knowledge Base</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground/50">AI training sources</p>
          </div>
        </div>
        <Link
          href="/knowledge"
          className="rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Manage
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {/* Total */}
        <div className="flex flex-col items-center justify-center rounded-lg bg-muted/40 border border-border/30 py-3 gap-1">
          <FileText className="h-3.5 w-3.5 text-muted-foreground/50 mb-0.5" />
          <span className="text-lg font-bold tabular-nums leading-none text-foreground">{counts.total}</span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/50">Total</span>
        </div>
        {/* Ready */}
        <div className="flex flex-col items-center justify-center rounded-lg bg-success/8 border border-success/15 py-3 gap-1">
          <CheckCircle2 className="h-3.5 w-3.5 text-success mb-0.5" />
          <span className="text-lg font-bold tabular-nums leading-none text-success">{counts.ready}</span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-success/60">Ready</span>
        </div>
        {/* Processing */}
        <div className="flex flex-col items-center justify-center rounded-lg bg-warning/8 border border-warning/15 py-3 gap-1">
          <Loader2 className={`h-3.5 w-3.5 text-warning mb-0.5 ${counts.processing > 0 ? 'animate-spin' : ''}`} />
          <span className="text-lg font-bold tabular-nums leading-none text-warning">{counts.processing}</span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-warning/60">Processing</span>
        </div>
        {/* Failed */}
        <div className="flex flex-col items-center justify-center rounded-lg bg-destructive/8 border border-destructive/15 py-3 gap-1">
          <AlertCircle className="h-3.5 w-3.5 text-destructive mb-0.5" />
          <span className="text-lg font-bold tabular-nums leading-none text-destructive">{counts.failed}</span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-destructive/60">Failed</span>
        </div>
      </div>
    </div>
  )
}
