import { cn } from '@/lib/utils'
import type { AgentActivity } from '@/types'

interface AgentActivityListProps {
  data: AgentActivity[]
}

export function AgentActivityList({ data }: AgentActivityListProps) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/60 p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold tracking-tight">Agent Activity</h2>
        <p className="mt-0.5 text-[11px] text-muted-foreground/60">
          {data.filter(a => a.is_online).length} of {data.length} online
        </p>
      </div>
      <div className="divide-y divide-border/40">
        {data.map((agent) => (
          <div key={agent.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                {agent.full_name.charAt(0)}
              </div>
              <span className={cn(
                'absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-card',
                agent.is_online ? 'bg-success' : 'bg-muted-foreground/30'
              )} />
            </div>

            {/* Name + role */}
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium leading-snug">{agent.full_name}</p>
              <p className="text-[11px] text-muted-foreground/60 capitalize">{agent.role}</p>
            </div>

            {/* Conversation count */}
            <div className="shrink-0 text-right">
              <p className={cn(
                'text-sm font-semibold tabular-nums',
                agent.assigned_count > 0 ? 'text-foreground' : 'text-muted-foreground/30'
              )}>
                {agent.assigned_count}
              </p>
              <p className="text-[10px] text-muted-foreground/40">active</p>
            </div>
          </div>
        ))}

        {data.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground/50">No agents found</p>
        )}
      </div>
    </div>
  )
}
