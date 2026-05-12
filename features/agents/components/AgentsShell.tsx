'use client'

import { useState, useMemo, useActionState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UserPlus, Search, Pencil, Archive, ShieldCheck, ShieldOff, X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { inviteAgentAction, updateAgentStatusAction, updateAgentRoleAction } from '@/features/agents/actions'
import { AGENTS_PER_PAGE } from '@/lib/constants'
import type { AgentWithConvCount, AgentRole, AgentStatus } from '@/types'

const ROLE_BADGE: Record<AgentRole, string> = {
  admin: 'bg-warning/15 text-warning',
  agent: 'bg-primary/15 text-primary',
}

const STATUS_BADGE: Record<AgentStatus, { cls: string; label: string }> = {
  active:    { cls: 'bg-success/15 text-success',            label: 'Active'    },
  suspended: { cls: 'bg-warning/15 text-warning',            label: 'Suspended' },
  archived:  { cls: 'bg-muted text-muted-foreground',        label: 'Archived'  },
}

interface Props {
  agents:        AgentWithConvCount[]
  currentUserId: string
}

export function AgentsShell({ agents, currentUserId }: Props) {
  const [search, setSearch]           = useState('')
  const [roleFilter, setRoleFilter]   = useState<'all' | AgentRole>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | AgentStatus>('all')
  const [page, setPage]               = useState(0)
  const [showInvite, setShowInvite]   = useState(false)

  const filtered = useMemo(() => {
    let list = agents
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((a) =>
        a.full_name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.username.toLowerCase().includes(q)
      )
    }
    if (roleFilter   !== 'all') list = list.filter((a) => a.role   === roleFilter)
    if (statusFilter !== 'all') list = list.filter((a) => a.status === statusFilter)
    return list
  }, [agents, search, roleFilter, statusFilter])

  const totalPages = Math.ceil(filtered.length / AGENTS_PER_PAGE)
  const paged      = filtered.slice(page * AGENTS_PER_PAGE, (page + 1) * AGENTS_PER_PAGE)

  const handleStatusChange = async (agentId: string, status: AgentStatus) => {
    const result = await updateAgentStatusAction(agentId, status)
    if (result.error) toast.error(result.error)
    else toast.success('Agent updated')
  }

  const handleRoleChange = async (agentId: string, role: AgentRole) => {
    const result = await updateAgentRoleAction(agentId, role)
    if (result.error) toast.error(result.error)
    else toast.success('Role updated')
  }

  return (
    <div className="p-4 pt-16 lg:p-6 lg:pt-6 space-y-6 font-agent">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl">Agents</h1>
          <p className="mt-1 text-sm text-muted-foreground">{agents.length} team members</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Invite Agent
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            placeholder="Search agents…"
            className="w-full rounded-xl border border-border bg-input pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value as 'all' | AgentRole); setPage(0) }}
          className="rounded-xl border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
        >
          <option value="all">All roles</option>
          <option value="admin">Admin</option>
          <option value="agent">Agent</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as 'all' | AgentStatus); setPage(0) }}
          className="rounded-xl border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
        >
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50">
              {['Agent', 'Role', 'Status', 'Conversations', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((agent) => (
              <tr key={agent.id} className="border-b border-border/30 hover:bg-accent/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 font-heading text-xs text-primary">
                        {agent.full_name.charAt(0)}
                      </div>
                      <span className={cn(
                        'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card',
                        agent.is_online ? 'bg-success' : 'bg-muted-foreground/40'
                      )} />
                    </div>
                    <div>
                      <p className="font-medium">{agent.full_name}</p>
                      <p className="text-xs text-muted-foreground">{agent.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={cn('badge-glow text-[11px]', ROLE_BADGE[agent.role])}>
                    {agent.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn('badge-glow text-[11px]', STATUS_BADGE[agent.status].cls)}>
                    {STATUS_BADGE[agent.status].label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-semibold text-primary">{agent.assigned_conversations}</span>
                </td>
                <td className="px-4 py-3">
                  {agent.id !== currentUserId && (
                    <div className="flex items-center gap-1">
                      {agent.status === 'active' ? (
                        <button
                          onClick={() => handleStatusChange(agent.id, 'suspended')}
                          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:text-warning hover:bg-warning/10 transition-colors"
                          title="Suspend"
                        >
                          <ShieldOff className="h-3 w-3" />
                        </button>
                      ) : agent.status === 'suspended' ? (
                        <button
                          onClick={() => handleStatusChange(agent.id, 'active')}
                          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:text-success hover:bg-success/10 transition-colors"
                          title="Activate"
                        >
                          <ShieldCheck className="h-3 w-3" />
                        </button>
                      ) : null}
                      {agent.status !== 'archived' && (
                        <button
                          onClick={() => handleStatusChange(agent.id, 'archived')}
                          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Archive"
                        >
                          <Archive className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        onClick={() => handleRoleChange(agent.id, agent.role === 'admin' ? 'agent' : 'admin')}
                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        title={agent.role === 'admin' ? 'Demote to agent' : 'Promote to admin'}
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {paged.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No agents found
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-border disabled:opacity-40 hover:bg-accent transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-muted-foreground">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-border disabled:opacity-40 hover:bg-accent transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Invite Modal */}
      <AnimatePresence>
        {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
      </AnimatePresence>
    </div>
  )
}

// ── Invite Modal ──────────────────────────────────────────────────────────────
function InviteModal({ onClose }: { onClose: () => void }) {
  const [state, formAction, isPending] = useActionState(inviteAgentAction, {})

  if (state.data) {
    toast.success('Invitation sent successfully')
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md glass-card p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-xl">Invite Agent</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {state.error && (
          <div className="mb-4 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-4">
          {[
            { name: 'full_name', label: 'Full Name',  type: 'text',  placeholder: 'Jane Smith'     },
            { name: 'username',  label: 'Username',   type: 'text',  placeholder: 'jane.smith'     },
            { name: 'email',     label: 'Email',      type: 'email', placeholder: 'jane@company.com' },
          ].map((f) => (
            <div key={f.name} className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {f.label}
              </label>
              <input
                name={f.name}
                type={f.type}
                placeholder={f.placeholder}
                required
                className="w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
          ))}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Role
            </label>
            <select
              name="role"
              defaultValue="agent"
              className="w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
            >
              <option value="agent">Agent</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : 'Send Invite'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
