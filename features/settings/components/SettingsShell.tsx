'use client'

import { useState, useActionState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Save, Plus, Trash2, X, Bot, Clock, Shield, Sparkles,
  Zap, ZapOff, Loader2, ChevronDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  saveWorkspaceSettingsAction,
  saveSystemPromptAction,
  deleteSystemPromptAction,
} from '@/features/settings/actions'
import type { WorkspaceSettings, SystemPrompt } from '@/types'

// ── Micro Toggle ──────────────────────────────────────────────────────────────
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
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full',
        'transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-primary/50 disabled:opacity-40 disabled:cursor-not-allowed',
        checked ? 'bg-primary' : 'bg-border'
      )}
    >
      <span className={cn(
        'pointer-events-none block h-3.5 w-3.5 rounded-full bg-foreground shadow-sm transition-transform duration-200',
        checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
      )} />
    </button>
  )
}

// ── Section Label ─────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">
        {children}
      </span>
      <div className="flex-1 h-px bg-border/40" />
    </div>
  )
}

interface Props {
  settings: WorkspaceSettings | null
  prompts:  SystemPrompt[]
}

export function SettingsShell({ settings, prompts }: Props) {
  // Local state mirrors the server data — saves feel instant
  const [aiEnabled,        setAiEnabled]        = useState(settings?.ai_enabled        ?? true)
  const [autoReturn,       setAutoReturn]        = useState(settings?.auto_return_enabled ?? true)
  const [autoMinutes,      setAutoMinutes]       = useState(settings?.auto_return_ai_minutes ?? 5)
  const [escalationOn,     setEscalationOn]      = useState(settings?.escalation_enabled ?? true)
  const [keywords,         setKeywords]          = useState(settings?.escalation_keywords?.join(', ') ?? '')
  const [showDisableConfirm, setShowDisableConfirm] = useState(false)
  const [editingPrompt,    setEditingPrompt]     = useState<SystemPrompt | null>(null)
  const [savingSettings,   setSavingSettings]    = useState(false)

  // ── Save settings ──────────────────────────────────────────────────────────
  const handleSaveSettings = async () => {
    setSavingSettings(true)
    const fd = new FormData()
    fd.set('ai_enabled',             String(aiEnabled))
    fd.set('auto_return_enabled',    String(autoReturn))
    fd.set('auto_return_ai_minutes', String(autoMinutes))
    fd.set('escalation_enabled',     String(escalationOn))
    fd.set('escalation_keywords',    keywords)
    const result = await saveWorkspaceSettingsAction({}, fd)
    setSavingSettings(false)
    if (result.error) toast.error(result.error)
    else toast.success('Settings saved')
  }

  const handleDeletePrompt = async (id: string) => {
    if (!confirm('Delete this prompt?')) return
    const result = await deleteSystemPromptAction(id)
    if (result.error) toast.error(result.error)
    else toast.success('Prompt deleted')
  }

  return (
    <div className="p-6 space-y-8 max-w-3xl font-agent">
      <div>
        <h1 className="font-heading text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Configure your workspace</p>
      </div>

      {/* ── AI Controls ──────────────────────────────────────────────── */}
      <div className="glass-card p-6 space-y-6">
        <SectionLabel>AI Controls</SectionLabel>

        {/* Master AI toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'flex h-9 w-9 items-center justify-center rounded-xl',
              aiEnabled ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
            )}>
              {aiEnabled ? <Zap className="h-4 w-4" /> : <ZapOff className="h-4 w-4" />}
            </div>
            <div>
              <p className="text-sm font-semibold">AI Auto-Reply</p>
              <p className="text-xs text-muted-foreground">Enable or disable AI responses globally</p>
            </div>
          </div>
          <Toggle
            checked={aiEnabled}
            onChange={(v) => {
              if (!v) setShowDisableConfirm(true)
              else setAiEnabled(true)
            }}
          />
        </div>

        {/* Auto-return */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-chart-blue/10 text-chart-blue">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">Auto-Return to AI</p>
              <p className="text-xs text-muted-foreground">Return to AI after human inactivity</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1} max={60}
              value={autoMinutes}
              onChange={(e) => setAutoMinutes(Number(e.target.value))}
              className="w-16 rounded-xl border border-border bg-input px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
            <span className="text-xs text-muted-foreground">min</span>
            <Toggle checked={autoReturn} onChange={setAutoReturn} />
          </div>
        </div>

        {/* Escalation */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-warning/10 text-warning">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">Escalation Keywords</p>
                <p className="text-xs text-muted-foreground">Flag conversations containing these words</p>
              </div>
            </div>
            <Toggle checked={escalationOn} onChange={setEscalationOn} />
          </div>
          {escalationOn && (
            <input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="urgent, cancel, refund, lawsuit, angry, manager"
              className="w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          )}
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={savingSettings}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Settings
        </button>
      </div>

      {/* ── System Prompts ────────────────────────────────────────────── */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <SectionLabel>System Prompts</SectionLabel>
          <button
            onClick={() => setEditingPrompt({
              id: `new-${Date.now()}`, name: '', content: '',
              is_active: false, model: 'gpt-4o', provider: 'openai',
              temperature: 0.7, workspace_id: '', created_by: null,
              created_at: '', updated_at: '',
            })}
            className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New Prompt
          </button>
        </div>

        <div className="space-y-2">
          {prompts.map((prompt) => (
            <div
              key={prompt.id}
              className={cn(
                'flex items-start gap-3 rounded-xl border p-4 transition-colors',
                prompt.is_active
                  ? 'border-primary/20 bg-primary/5'
                  : 'border-border/50 bg-surface/50'
              )}
            >
              <div className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl mt-0.5',
                prompt.is_active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
              )}>
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{prompt.name}</p>
                  {prompt.is_active && (
                    <span className="badge-primary text-[10px]">Active</span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {prompt.model} · {prompt.provider} · temp {prompt.temperature}
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground/70">
                  {prompt.content}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => setEditingPrompt(prompt)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <Save className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDeletePrompt(prompt.id)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
          {prompts.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No prompts yet — create one above
            </p>
          )}
        </div>
      </div>

      {/* Disable AI confirmation */}
      <AnimatePresence>
        {showDisableConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
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
                <button onClick={() => setShowDisableConfirm(false)} className="flex-1 rounded-xl border border-border py-2.5 text-sm hover:bg-accent transition-colors">
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

      {/* Prompt editor */}
      <AnimatePresence>
        {editingPrompt && (
          <PromptEditorModal
            prompt={editingPrompt}
            onClose={() => setEditingPrompt(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Prompt Editor Modal ───────────────────────────────────────────────────────
function PromptEditorModal({ prompt, onClose }: { prompt: SystemPrompt; onClose: () => void }) {
  const [state, formAction, isPending] = useActionState(saveSystemPromptAction, {})

  if (state.data !== undefined) {
    toast.success('Prompt saved')
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-2xl glass-card p-6 max-h-[90vh] overflow-y-auto custom-scrollbar"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-xl">
            {prompt.id.startsWith('new-') ? 'New Prompt' : 'Edit Prompt'}
          </h2>
          <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>

        {state.error && (
          <div className="mb-4 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={prompt.id} />

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Name</label>
            <input name="name" defaultValue={prompt.name} required
              className="w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">System Prompt</label>
            <textarea name="content" defaultValue={prompt.content} required rows={8}
              className="w-full resize-none rounded-xl border border-border bg-input px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary/40" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Model</label>
              <select name="model" defaultValue={prompt.model}
                className="w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40">
                <option value="gpt-4o">gpt-4o</option>
                <option value="gpt-4o-mini">gpt-4o-mini</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Provider</label>
              <select name="provider" defaultValue={prompt.provider}
                className="w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40">
                <option value="openai">OpenAI</option>
                <option value="openrouter">OpenRouter</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Temperature</label>
              <input name="temperature" type="number" min={0} max={2} step={0.1}
                defaultValue={prompt.temperature}
                className="w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input type="hidden" name="is_active" value={String(prompt.is_active)} />
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" name="is_active" value="true" defaultChecked={prompt.is_active}
                onChange={(e) => {}}
                className="rounded border-border" />
              Set as active prompt
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-accent transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {isPending ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</> : 'Save Prompt'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
