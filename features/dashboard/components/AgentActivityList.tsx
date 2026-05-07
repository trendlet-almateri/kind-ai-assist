import { cn } from '@/lib/utils'
import type { AgentActivity } from '@/types'

interface AgentActivityListProps {
  data: AgentActivity[]
}

export function AgentActivityList({ data }: AgentActivityListProps) {
  return (
    <div className="glass-card p-6">
      <h2 className="font-heading text-base mb-4">Agent Activity</h2>
      <div className="space-y-3">
        {data.map((agent) => (
          <div key={agent.id} className="flex items-center gap-3">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 font-heading text-xs text-primary">
                {agent.full_name.charAt(0)}
              </div>
              <span className={cn(
                'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-sidebar',
                agent.is_online ? 'bg-success' : 'bg-muted-foreground/40'
              )} />
            </div>

            {/* Name + role */}
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">{agent.full_name}</p>
              <p className="text-xs text-muted-foreground capitalize">{agent.role}</p>
            </div>

            {/* Conversation count */}
            <div className="shrink-0 text-right">
              <p className="text-sm font-semibold text-primary">
                {agent.assigned_count}
              </p>
              <p className="text-[10px] text-muted-foreground">active</p>
            </div>
          </div>
        ))}

        {data.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No agents found
          </p>
        )}
      </div>
    </div>
  )
}
