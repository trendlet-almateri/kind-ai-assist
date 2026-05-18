'use client'

import { useState, useMemo, useActionState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UserPlus, Search, Pencil, Archive, ShieldCheck, ShieldOff,
  X, Loader2, ChevronLeft, ChevronRight, ChevronDown, Check, Eye,
  Mail, AtSign, MessageSquare, Wifi, WifiOff,
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
  const [selectedAgent, setSelectedAgent] = useState<AgentWithConvCount | null>(null)

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
    <>
    <div className="p-4 pt-20 lg:p-6 lg:pt-6 space-y-5 font-agent">

      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl leading-none">Agents</h1>
        <p className="mt-1.5 text-xs text-muted-foreground/60">{agents.length} agents total</p>
      </div>

      {/* Filters + Invite */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            placeholder="Search name, email…"
            className="w-full rounded-xl border border-border bg-card pl-9 pr-3 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>
        <FilterDropdown value={roleFilter}   onChange={(v) => { setRoleFilter(v);   setPage(0) }} options={ROLE_OPTIONS}   />
        <FilterDropdown value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(0) }} options={STATUS_OPTIONS} />
        <button
          onClick={() => setShowInvite(true)}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors ml-auto"
        >
          <UserPlus className="h-4 w-4" />
          <span>Invite Agent</span>
        </button>
      </div>

      {/* Table — mobile: 3 cols + row tap for modal | desktop: full details inline */}
      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50">
              <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">Agent</th>
              <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60 hidden lg:table-cell">Email</th>
              <th className="px-4 py-3.5 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">Role</th>
              <th className="px-4 py-3.5 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">Status</th>
              <th className="px-4 py-3.5 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60 hidden lg:table-cell">Online</th>
              <th className="px-4 py-3.5 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60 hidden lg:table-cell">Assigned</th>
              <th className="px-4 py-3.5 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60 hidden lg:table-cell">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((agent) => (
              <tr
                key={agent.id}
                onClick={() => { if (window.innerWidth < 1024) setSelectedAgent(agent) }}
                className="border-b border-border/30 hover:bg-accent/40 transition-colors cursor-pointer lg:cursor-default"
              >
                {/* Agent */}
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 font-heading text-sm font-bold text-primary">
                        {agent.full_name.charAt(0)}
                      </div>
                      <span className={cn(
                        'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card',
                        agent.is_online ? 'bg-success' : 'bg-muted-foreground/30'
                      )} />
                    </div>
                    <div>
                      <p className="font-semibold text-[13px] leading-none mb-1">{agent.full_name}</p>
                      <p className="text-[11px] text-muted-foreground/60">@{agent.username}</p>
                    </div>
                  </div>
                </td>
                {/* Email — desktop only */}
                <td className="px-4 py-4 hidden lg:table-cell">
                  <span className="text-xs text-muted-foreground">{agent.email}</span>
                </td>
                {/* Role */}
                <td className="px-4 py-4 text-center">
                  <span className={cn('badge-glow text-[11px]', ROLE_BADGE[agent.role])}>
                    {agent.role}
                  </span>
                </td>
                {/* Status */}
                <td className="px-4 py-4 text-center">
                  <span className={cn('badge-glow text-[11px]', STATUS_BADGE[agent.status].cls)}>
                    {STATUS_BADGE[agent.status].label}
                  </span>
                </td>
                {/* Online — desktop only */}
                <td className="px-4 py-4 text-center hidden lg:table-cell">
                  <span className={cn('inline-block h-2.5 w-2.5 rounded-full', agent.is_online ? 'bg-success' : 'bg-muted-foreground/30')} />
                </td>
                {/* Assigned — desktop only */}
                <td className="px-4 py-4 text-center hidden lg:table-cell">
                  <span className="font-semibold text-foreground">{agent.assigned_conversations}</span>
                </td>
                {/* Actions — desktop only */}
                <td className="px-4 py-4 hidden lg:table-cell" onClick={(e) => e.stopPropagation()}>
                  {agent.id !== currentUserId && (
                    <div className="flex items-center justify-center gap-1">
                      {agent.status === 'active' ? (
                        <button onClick={() => handleStatusChange(agent.id, 'suspended')} className="rounded-lg p-1.5 text-muted-foreground hover:text-warning hover:bg-warning/10 transition-colors" title="Suspend">
                          <ShieldOff className="h-3.5 w-3.5" />
                        </button>
                      ) : agent.status === 'suspended' ? (
                        <button onClick={() => handleStatusChange(agent.id, 'active')} className="rounded-lg p-1.5 text-muted-foreground hover:text-success hover:bg-success/10 transition-colors" title="Activate">
                          <ShieldCheck className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                      {agent.status !== 'archived' && (
                        <button onClick={() => handleStatusChange(agent.id, 'archived')} className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Archive">
                          <Archive className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button onClick={() => handleRoleChange(agent.id, agent.role === 'admin' ? 'agent' : 'admin')} className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" title={agent.role === 'admin' ? 'Demote to agent' : 'Promote to admin'}>
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

    </div>

    <AnimatePresence>
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
      {selectedAgent && (
        <AgentDetailModal
          agent={selectedAgent}
          isSelf={selectedAgent.id === currentUserId}
          onClose={() => setSelectedAgent(null)}
          onStatusChange={async (id, status) => {
            await handleStatusChange(id, status)
            setSelectedAgent(null)
          }}
          onRoleChange={async (id, role) => {
            await handleRoleChange(id, role)
            setSelectedAgent(null)
          }}
        />
      )}
    </AnimatePresence>
    </>
  )
}

// ── Agent Detail Modal ────────────────────────────────────────────────────────
function AgentDetailModal({
  agent, isSelf, onClose, onStatusChange, onRoleChange,
}: {
  agent: AgentWithConvCount
  isSelf: boolean
  onClose: () => void
  onStatusChange: (id: string, status: AgentStatus) => Promise<void>
  onRoleChange: (id: string, role: AgentRole) => Promise<void>
}) {
  const [loading, setLoading] = useState<string | null>(null)

  const act = async (fn: () => Promise<void>, key: string) => {
    setLoading(key)
    try { await fn() } finally { setLoading(null) }
  }

  const status = STATUS_BADGE[agent.status]

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/75 sm:items-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="w-full rounded-t-2xl sm:rounded-2xl sm:max-w-sm glass-card p-0 overflow-hidden"
      >
        {/* Top section — avatar + name */}
        <div className="relative px-6 pt-6 pb-5 border-b border-border/40">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 font-heading text-2xl font-bold text-primary">
                {agent.full_name.charAt(0)}
              </div>
              <span className={cn(
                'absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-card',
                agent.is_online ? 'bg-success' : 'bg-muted-foreground/30'
              )} />
            </div>
            <div>
              <p className="text-base font-semibold leading-none mb-1.5">{agent.full_name}</p>
              <div className="flex items-center gap-2">
                <span className={cn('badge-glow text-[11px]', ROLE_BADGE[agent.role])}>{agent.role}</span>
                <span className={cn('badge-glow text-[11px]', status.cls)}>{status.label}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Info rows */}
        <div className="px-6 py-4 space-y-3 border-b border-border/40">
          <div className="flex items-center gap-3">
            <Mail className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
            <span className="text-sm text-muted-foreground">{agent.email}</span>
          </div>
          <div className="flex items-center gap-3">
            <AtSign className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
            <span className="text-sm text-muted-foreground">{agent.username}</span>
          </div>
          <div className="flex items-center gap-3">
            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{agent.assigned_conversations}</span> assigned conversations
            </span>
          </div>
          <div className="flex items-center gap-3">
            {agent.is_online
              ? <Wifi className="h-3.5 w-3.5 text-success shrink-0" />
              : <WifiOff className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
            }
            <span className="text-sm text-muted-foreground">
              {agent.is_online ? 'Online now' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Actions */}
        {!isSelf && (
          <div className="px-6 py-4 space-y-2">
            {/* Status actions */}
            {agent.status === 'active' && (
              <button
                onClick={() => act(() => onStatusChange(agent.id, 'suspended'), 'suspend')}
                disabled={!!loading}
                className="flex w-full items-center gap-3 rounded-xl border border-warning/20 bg-warning/5 px-4 py-3 text-sm font-medium text-warning hover:bg-warning/10 transition-colors disabled:opacity-50"
              >
                {loading === 'suspend' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
                Suspend agent
              </button>
            )}
            {agent.status === 'suspended' && (
              <button
                onClick={() => act(() => onStatusChange(agent.id, 'active'), 'activate')}
                disabled={!!loading}
                className="flex w-full items-center gap-3 rounded-xl border border-success/20 bg-success/5 px-4 py-3 text-sm font-medium text-success hover:bg-success/10 transition-colors disabled:opacity-50"
              >
                {loading === 'activate' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Activate agent
              </button>
            )}
            {agent.status !== 'archived' && (
              <button
                onClick={() => act(() => onStatusChange(agent.id, 'archived'), 'archive')}
                disabled={!!loading}
                className="flex w-full items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
              >
                {loading === 'archive' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                Archive agent
              </button>
            )}
            <button
              onClick={() => act(() => onRoleChange(agent.id, agent.role === 'admin' ? 'agent' : 'admin'), 'role')}
              disabled={!!loading}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-accent/40 px-4 py-3 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
            >
              {loading === 'role' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
              {agent.role === 'admin' ? 'Demote to Agent' : 'Promote to Admin'}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

// ── Invite Modal ──────────────────────────────────────────────────────────────
function InviteModal({ onClose }: { onClose: () => void }) {
  const [state, formAction, isPending] = useActionState(inviteAgentAction, {})
  const [role, setRole]     = useState<AgentRole>('agent')
  const [roleOpen, setRoleOpen] = useState(false)

  const roleOptions: { value: AgentRole; label: string; dot: string; desc: string }[] = [
    { value: 'agent', label: 'Agent', dot: 'bg-primary',  desc: 'Can view and reply to conversations' },
    { value: 'admin', label: 'Admin', dot: 'bg-warning',  desc: 'Full access including team management' },
  ]
  const selected = roleOptions.find((o) => o.value === role)!

  useEffect(() => {
    if (state.data) {
      toast.success('Invitation sent successfully')
      onClose()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.data])

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
            { name: 'username',  label: 'Username',   type: 'text',  placeholder: 'e.g. jane.smith'   },
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
            {/* Hidden input submits with the form */}
            <input type="hidden" name="role" value={role} />
            <div className="relative">
              <button
                type="button"
                onClick={() => setRoleOpen((p) => !p)}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-input px-3 py-2.5 text-sm hover:border-border/80 transition-colors"
              >
                <span className={cn('h-2 w-2 rounded-full shrink-0', selected.dot)} />
                <span className="flex-1 text-left font-medium">{selected.label}</span>
                <span className="text-xs text-muted-foreground/50 mr-1">{selected.desc}</span>
                <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground/50 shrink-0 transition-transform', roleOpen && 'rotate-180')} />
              </button>

              <AnimatePresence>
                {roleOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setRoleOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 top-full z-20 mt-1.5 w-full rounded-xl border border-border bg-card shadow-xl overflow-hidden"
                    >
                      {roleOptions.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => { setRole(opt.value); setRoleOpen(false) }}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-sm hover:bg-accent transition-colors"
                        >
                          <span className={cn('h-2 w-2 rounded-full shrink-0', opt.dot)} />
                          <span className="font-medium">{opt.label}</span>
                          <span className="ml-auto text-xs text-muted-foreground/50">{opt.desc}</span>
                          {role === opt.value && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
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
