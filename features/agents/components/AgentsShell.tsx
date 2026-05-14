'use client'

import { useState, useMemo, useActionState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UserPlus, Search, Pencil, Archive, ShieldCheck, ShieldOff,
  X, Loader2, ChevronLeft, ChevronRight, ChevronDown, Check,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { inviteAgentAction, updateAgentStatusAction, updateAgentRoleAction } from '@/features/agents/actions'
import { AGENTS_PER_PAGE } from '@/lib/constants'
import type { AgentWithConvCount, AgentRole, AgentStatus } from '@/types'

const ROLE_BADGE: Record<AgentRole, string> = {
  admin: 'bg-warning/15 text-warning',
  agent: 'bg-primary/15 text-primary',
}

const STATUS_BADGE: Record<AgentStatus, { cls: string; dot: string; label: string }> = {
  active:    { cls: 'bg-success/15 text-success',       dot: 'bg-success',          label: 'Active'    },
  suspended: { cls: 'bg-warning/15 text-warning',       dot: 'bg-warning',          label: 'Suspended' },
  archived:  { cls: 'bg-muted text-muted-foreground',   dot: 'bg-muted-foreground', label: 'Archived'  },
}

// ── Generic custom dropdown ───────────────────────────────────────────────────
function FilterDropdown<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; dot?: string }[]
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === value)!

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm min-w-[130px] hover:border-border/80 transition-colors"
      >
        {selected.dot && <span className={cn('h-2 w-2 rounded-full shrink-0', selected.dot)} />}
        <span className="flex-1 text-left">{selected.label}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 top-full z-20 mt-1.5 w-44 rounded-xl border border-border bg-card shadow-xl overflow-hidden"
            >
              {options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setOpen(false) }}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-accent transition-colors"
                >
                  {opt.dot
                    ? <span className={cn('h-2 w-2 rounded-full shrink-0', opt.dot)} />
                    : <span className="h-2 w-2 shrink-0" />
                  }
                  <span className="flex-1 text-left">{opt.label}</span>
                  {value === opt.value && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

const ROLE_OPTIONS: { value: 'all' | AgentRole; label: string; dot?: string }[] = [
  { value: 'all',   label: 'All Roles' },
  { value: 'admin', label: 'Admin',    dot: 'bg-warning' },
  { value: 'agent', label: 'Agent',    dot: 'bg-primary' },
]

const STATUS_OPTIONS: { value: 'all' | AgentStatus; label: string; dot?: string }[] = [
  { value: 'all',       label: 'All Statuses' },
  { value: 'active',    label: 'Active',    dot: 'bg-success' },
  { value: 'suspended', label: 'Suspended', dot: 'bg-warning' },
  { value: 'archived',  label: 'Archived',  dot: 'bg-muted-foreground' },
]

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  agents:        AgentWithConvCount[]
  currentUserId: string
}

export function AgentsShell({ agents, currentUserId }: Props) {
  const [search, setSearch]               = useState('')
  const [roleFilter, setRoleFilter]       = useState<'all' | AgentRole>('all')
  const [statusFilter, setStatusFilter]   = useState<'all' | AgentStatus>('all')
  const [page, setPage]                   = useState(0)
  const [showInvite, setShowInvite]       = useState(false)

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
          <p className="mt-1 text-sm text-muted-foreground">{agents.length} agents total</p>
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
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            placeholder="Search name, email, username…"
            className="w-full rounded-xl border border-border bg-card pl-9 pr-3 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>
        <FilterDropdown value={roleFilter}   onChange={(v) => { setRoleFilter(v);   setPage(0) }} options={ROLE_OPTIONS}   />
        <FilterDropdown value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(0) }} options={STATUS_OPTIONS} />
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50">
              {['Agent', 'Email', 'Role', 'Status', 'Online', 'Assigned', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((agent) => (
              <tr key={agent.id} className="border-b border-border/30 hover:bg-accent/30 transition-colors">
                {/* Agent */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 font-heading text-xs text-primary shrink-0">
                      {agent.full_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{agent.full_name}</p>
                      <p className="text-xs text-muted-foreground">@{agent.username}</p>
                    </div>
                  </div>
                </td>
                {/* Email */}
                <td className="px-4 py-3 text-xs text-muted-foreground">{agent.email}</td>
                {/* Role */}
                <td className="px-4 py-3">
                  <span className={cn('badge-glow text-[11px]', ROLE_BADGE[agent.role])}>
                    {agent.role}
                  </span>
                </td>
                {/* Status */}
                <td className="px-4 py-3">
                  <span className={cn('badge-glow text-[11px]', STATUS_BADGE[agent.status].cls)}>
                    {STATUS_BADGE[agent.status].label}
                  </span>
                </td>
                {/* Online dot */}
                <td className="px-4 py-3">
                  <span className={cn(
                    'h-2.5 w-2.5 rounded-full inline-block',
                    agent.is_online ? 'bg-success' : 'bg-muted-foreground/30'
                  )} />
                </td>
                {/* Assigned */}
                <td className="px-4 py-3">
                  <span className="font-semibold text-primary">{agent.assigned_conversations}</span>
                </td>
                {/* Actions */}
                <td className="px-4 py-3">
                  {agent.id !== currentUserId && (
                    <div className="flex items-center gap-1">
                      {agent.status === 'active' ? (
                        <button
                          onClick={() => handleStatusChange(agent.id, 'suspended')}
                          className="rounded-lg p-1.5 text-muted-foreground hover:text-warning hover:bg-warning/10 transition-colors"
                          title="Suspend"
                        >
                          <ShieldOff className="h-3.5 w-3.5" />
                        </button>
                      ) : agent.status === 'suspended' ? (
                        <button
                          onClick={() => handleStatusChange(agent.id, 'active')}
                          className="rounded-lg p-1.5 text-muted-foreground hover:text-success hover:bg-success/10 transition-colors"
                          title="Activate"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                      {agent.status !== 'archived' && (
                        <button
                          onClick={() => handleStatusChange(agent.id, 'archived')}
                          className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Archive"
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleRoleChange(agent.id, agent.role === 'admin' ? 'agent' : 'admin')}
                        className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        title={agent.role === 'admin' ? 'Demote to agent' : 'Promote to admin'}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {paged.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">No agents found</div>
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
          <span className="text-sm text-muted-foreground">{page + 1} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-border disabled:opacity-40 hover:bg-accent transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

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
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md glass-card p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading text-xl">Invite Agent</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-accent transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {state.error && (
          <div className="mb-4 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-4">
          {[
            { name: 'full_name', label: 'Full Name',  type: 'text',  placeholder: 'Jane Smith'        },
            { name: 'username',  label: 'Username',   type: 'text',  placeholder: 'jane.smith'        },
            { name: 'email',     label: 'Email',      type: 'email', placeholder: 'jane@company.com'  },
          ].map((f) => (
            <div key={f.name} className="space-y-1.5">
              <label className="text-sm text-muted-foreground">{f.label}</label>
              <input
                name={f.name}
                type={f.type}
                placeholder={f.placeholder}
                required
                className="w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
          ))}

          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Role</label>
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
              type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={isPending}
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
