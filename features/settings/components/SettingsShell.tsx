'use client'

import { useState, useActionState, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Save, Plus, Trash2, Bot, Clock, Shield,
  Sparkles, Zap, ZapOff, Loader2, ChevronDown, Pencil,
} from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  saveWorkspaceSettingsAction,
  saveSystemPromptAction,
  deleteSystemPromptAction,
} from '@/features/settings/actions'
import type { WorkspaceSettings, SystemPrompt } from '@/types'
import type { IntegrationHealth } from '@/server/integrations/health'
import { IntegrationsHealthPanel } from './IntegrationsHealthPanel'

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }: {
  checked: boolean; onChange: (v: boolean) => void; disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full',
        'transition-colors duration-200 focus-visible:outline-none',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        checked ? 'bg-primary' : 'bg-border/60'
      )}
    >
      <span className={cn(
        'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200',
        checked ? 'translate-x-6' : 'translate-x-1'
      )} />
    </button>
  )
}

// ── Section Label ─────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/60 mb-4">
      {children}
    </p>
  )
}

interface Props {
  settings: WorkspaceSettings | null
  prompts:  SystemPrompt[]
  integrationsHealth: IntegrationHealth[]
}

const BLANK_PROMPT: SystemPrompt = {
  id: '', name: '', content: '', is_active: false,
  model: 'gpt-4o', provider: 'openai', temperature: 0.7,
  workspace_id: '', created_by: null, created_at: '', updated_at: '',
}

export function SettingsShell({ settings, prompts: initialPrompts, integrationsHealth }: Props) {
  const router = useRouter()

  // ── Workspace state ───────────────────────────────────────────────────────
  const [aiEnabled,    setAiEnabled]    = useState(settings?.ai_enabled         ?? true)
  const [autoReturn,   setAutoReturn]   = useState(settings?.auto_return_enabled ?? true)
  const [escalationOn, setEscalationOn] = useState(settings?.escalation_enabled  ?? true)
  const [showDisableConfirm, setShowDisableConfirm] = useState(false)
  const [savingSettings,     setSavingSettings]     = useState(false)

  // ── Prompt editor state ───────────────────────────────────────────────────
  // null = empty state (nothing selected), prompt = editing existing, BLANK = new
  const [editingPrompt, setEditingPrompt] = useState<SystemPrompt | null>(null)
  const [isNew,         setIsNew]         = useState(false)

  const startNew = () => {
    setEditingPrompt({ ...BLANK_PROMPT, id: '' })
    setIsNew(true)
  }

  const startEdit = (p: SystemPrompt) => {
    setEditingPrompt({ ...p })
    setIsNew(false)
  }

  // ── Save workspace settings ───────────────────────────────────────────────
  const handleSaveSettings = async () => {
    setSavingSettings(true)
    const fd = new FormData()
    fd.set('ai_enabled',          String(aiEnabled))
    fd.set('auto_return_enabled', String(autoReturn))
    fd.set('escalation_enabled',  String(escalationOn))
    const result = await saveWorkspaceSettingsAction({}, fd)
    setSavingSettings(false)
    if (result.error) toast.error(result.error)
    else toast.success('Settings saved')
  }

  // ── Delete prompt ─────────────────────────────────────────────────────────
  const handleDeletePrompt = async (id: string) => {
    const result = await deleteSystemPromptAction(id)
    if (result.error) toast.error(result.error)
    else { toast.success('Prompt deleted'); router.refresh() }
  }

  return (
    <div className="p-4 pt-16 lg:p-8 lg:pt-8 font-agent min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-3xl">Workspace &amp; AI</h1>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* ── LEFT — Workspace ─────────────────────────────────────────── */}
        <div className="glass-card p-6">
          <SectionLabel>Workspace</SectionLabel>

          <div className="space-y-1">
            {/* Bot Auto-Reply */}
            <div className="flex items-center justify-between py-4 border-b border-border/30">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-xl',
                  aiEnabled ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
                )}>
                  {aiEnabled ? <Zap className="h-4 w-4" /> : <ZapOff className="h-4 w-4" />}
                </div>
                <div>
                  <p className="text-sm font-medium">Bot Auto-Reply</p>
                  <p className="text-xs text-muted-foreground">
                    {aiEnabled ? 'Active — AI is responding' : 'Paused — no responses'}
                  </p>
                </div>
              </div>
              <Toggle
                checked={aiEnabled}
                onChange={(v) => { if (!v) setShowDisableConfirm(true); else setAiEnabled(true) }}
              />
            </div>

            {/* Auto-Return to AI */}
            <div className="flex items-center justify-between py-4 border-b border-border/30">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-success/10 text-success">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Auto-Return to AI</p>
                  <p className="text-xs text-muted-foreground">Return after agent inactivity</p>
                </div>
              </div>
              <Toggle checked={autoReturn} onChange={setAutoReturn} />
            </div>

            {/* Escalation Detection */}
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-warning/10 text-warning">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Escalation Detection</p>
                  <p className="text-xs text-muted-foreground">Flag by trigger keywords</p>
                </div>
              </div>
              <Toggle checked={escalationOn} onChange={setEscalationOn} />
            </div>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={savingSettings}
            className="mt-6 flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {savingSettings
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Save className="h-4 w-4" />}
            Save
          </button>
        </div>

        {/* ── RIGHT — AI Prompts ────────────────────────────────────────── */}
        <div className="glass-card p-6 space-y-5">
          <SectionLabel>AI Prompts</SectionLabel>

          {/* Prompts list header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Prompts</span>
              <span className={cn(
                'text-xs tabular-nums',
                initialPrompts.length >= 3 ? 'text-warning' : 'text-muted-foreground'
              )}>
                {initialPrompts.length}/3
              </span>
            </div>
            {initialPrompts.length < 3 ? (
              <button
                onClick={startNew}
                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                New
              </button>
            ) : (
              <span className="text-[10px] text-muted-foreground/50">Limit reached</span>
            )}
          </div>

          {/* Prompt list */}
          {initialPrompts.length > 0 && (
            <div className="space-y-1">
              {initialPrompts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => startEdit(p)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer transition-colors border',
                    editingPrompt?.id === p.id
                      ? 'bg-primary/8 border-primary/15'
                      : 'border-transparent hover:bg-accent/50'
                  )}
                >
                  <div className={cn(
                    'h-2 w-2 rounded-full shrink-0',
                    p.is_active ? 'bg-success' : 'bg-muted-foreground/40'
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {p.provider} · {p.model}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Divider */}
          <div className="h-px bg-border/40" />

          {/* Empty state — compact */}
          {!editingPrompt && (
            <div className="flex items-center justify-center gap-2 py-3 text-muted-foreground/40">
              <Sparkles className="h-3.5 w-3.5 opacity-50" />
              <p className="text-xs">Select a prompt to edit or click + New</p>
            </div>
          )}

          {/* Inline prompt editor — only when a prompt is selected or new */}
          {editingPrompt && (
            <PromptEditor
              key={editingPrompt.id || 'new'}
              prompt={editingPrompt}
              isNew={isNew}
              onSaved={() => { setEditingPrompt(null); router.refresh() }}
              onDeleted={() => { setEditingPrompt(null); router.refresh() }}
            />
          )}
        </div>
      </div>

      {/* Integrations health */}
      <div className="mt-6">
        <IntegrationsHealthPanel initial={integrationsHealth} />
      </div>

      {/* Disable AI confirmation modal */}
      <AnimatePresence>
        {showDisableConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-full max-w-sm glass-card p-6 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                  <ZapOff className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-heading text-lg">Disable AI?</h3>
                  <p className="text-xs text-muted-foreground">All conversations will need human responses</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDisableConfirm(false)}
                  className="flex-1 rounded-xl border border-border py-2.5 text-sm hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setAiEnabled(false); setShowDisableConfirm(false) }}
                  className="flex-1 rounded-xl bg-destructive py-2.5 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 transition-colors"
                >
                  Disable AI
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Inline Prompt Editor ──────────────────────────────────────────────────────
function PromptEditor({
  prompt, isNew, onSaved, onDeleted,
}: {
  prompt: SystemPrompt
  isNew: boolean
  onSaved: () => void
  onDeleted: () => void
}) {
  const [state, formAction, isPending] = useActionState(saveSystemPromptAction, {})
  const [provider,    setProvider]    = useState(prompt.provider ?? 'openai')
  const [temperature, setTemperature] = useState(prompt.temperature ?? 0.7)
  const [isActive,    setIsActive]    = useState(prompt.is_active ?? false)
  const [deleting,    setDeleting]    = useState(false)

  if (state.data !== undefined) {
    toast.success('Prompt saved')
    onSaved()
  }

  const handleDelete = async () => {
    if (!prompt.id || isNew) return
    setDeleting(true)
    const result = await deleteSystemPromptAction(prompt.id)
    setDeleting(false)
    if (result.error) toast.error(result.error)
    else { toast.success('Prompt deleted'); onDeleted() }
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id"          value={prompt.id} />
      <input type="hidden" name="provider"    value={provider} />
      <input type="hidden" name="temperature" value={temperature} />
      <input type="hidden" name="is_active"   value={String(isActive)} />

      {/* Label */}
      <div className="flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-muted-foreground/60" />
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/60">
          {isNew ? 'New Prompt' : 'Edit Prompt'}
        </span>
      </div>

      {state.error && (
        <p className="text-xs text-destructive">{state.error}</p>
      )}

      {/* Prompt name */}
      <input
        name="name"
        defaultValue={prompt.name}
        placeholder="Prompt name"
        required
        className="w-full rounded-xl border border-border/60 bg-input px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
      />

      {/* System instructions */}
      <textarea
        name="content"
        defaultValue={prompt.content}
        placeholder="System instructions..."
        required
        rows={6}
        className="w-full resize-none rounded-xl border border-border/60 bg-input px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
      />

      {/* Model */}
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Model</p>
        <div className="relative">
          <select
            name="model"
            defaultValue={prompt.model}
            className="w-full appearance-none rounded-xl border border-border/60 bg-input pl-3 pr-8 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
          >
            <option value="gpt-4o">gpt-4o  ·  $0.005/msg</option>
            <option value="gpt-4o-mini">gpt-4o-mini  ·  $0.001/msg</option>
            <option value="gpt-4.1-mini">gpt-4.1-mini  ·  $0.001/msg</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
        </div>
      </div>

      {/* Provider */}
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Provider</p>
        <div className="flex rounded-xl border border-border/60 overflow-hidden">
          {(['openai', 'openrouter'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setProvider(p)}
              className={cn(
                'flex-1 py-2 text-sm font-medium transition-colors capitalize',
                provider === p
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              )}
            >
              {p === 'openai' ? 'OpenAI' : 'OpenRouter'}
            </button>
          ))}
        </div>
      </div>

      {/* Temperature */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Temperature</p>
          <span className="text-xs font-medium tabular-nums">{temperature.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min={0} max={1} step={0.1}
          value={temperature}
          onChange={(e) => setTemperature(parseFloat(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground/50">
          <span>Precise</span>
          <span>Creative</span>
        </div>
      </div>

      {/* Active prompt */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Active prompt</p>
          <p className="text-xs text-muted-foreground">Used for all AI responses</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isActive}
          onClick={() => setIsActive(!isActive)}
          className={cn(
            'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200',
            isActive ? 'bg-primary' : 'bg-border/60'
          )}
        >
          <span className={cn(
            'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200',
            isActive ? 'translate-x-6' : 'translate-x-1'
          )} />
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        {!isNew && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 rounded-xl border border-border/60 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </button>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isPending
            ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
            : <><Save className="h-4 w-4" />Save</>}
        </button>
      </div>
    </form>
  )
}
