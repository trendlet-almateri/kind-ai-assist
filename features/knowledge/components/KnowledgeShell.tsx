'use client'

import { useState, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Search, FileText, FileType2, File,
  Plus, Trash2, AlertCircle, Loader2, X,
  ChevronDown, Check, Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatFileSize, timeAgo } from '@/lib/utils'
import { supabase } from '@/server/supabase/client'
import { STORAGE_BUCKET_KNOWLEDGE } from '@/lib/constants'
import type { KnowledgeSourceWithUploader, KnowledgeStatus } from '@/types'

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<KnowledgeStatus, { cls: string; dot: string; label: string; pulse?: boolean }> = {
  uploading:  { cls: 'bg-muted text-muted-foreground',     dot: 'bg-muted-foreground',  label: 'Uploading'   },
  processing: { cls: 'bg-warning/20 text-warning',         dot: 'bg-warning',           label: 'Processing', pulse: true },
  ready:      { cls: 'bg-success/20 text-success',         dot: 'bg-success',           label: 'Ready'       },
  failed:     { cls: 'bg-destructive/20 text-destructive', dot: 'bg-destructive',       label: 'Failed'      },
  deleted:    { cls: 'bg-muted text-muted-foreground',     dot: 'bg-muted-foreground',  label: 'Deleted'     },
}

const FILTER_OPTIONS: { value: 'all' | KnowledgeStatus; label: string; dot?: string }[] = [
  { value: 'all',        label: 'All Statuses' },
  { value: 'ready',      label: 'Ready',      dot: 'bg-success' },
  { value: 'processing', label: 'Processing', dot: 'bg-warning' },
  { value: 'uploading',  label: 'Uploading',  dot: 'bg-muted-foreground' },
  { value: 'failed',     label: 'Failed',     dot: 'bg-destructive' },
]

// ── Sub-components ────────────────────────────────────────────────────────────
function FileIcon({ type }: { type: string }) {
  if (type.includes('pdf'))  return <FileText className="h-7 w-7 text-destructive" />
  if (type.includes('word')) return <FileType2 className="h-7 w-7 text-primary" />
  return <File className="h-7 w-7 text-muted-foreground" />
}

function AvatarInitial({ name }: { name: string | null }) {
  return (
    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
      {name?.charAt(0)?.toUpperCase() ?? '?'}
    </div>
  )
}

// ── Custom status dropdown ────────────────────────────────────────────────────
function StatusDropdown({
  value,
  onChange,
}: {
  value: 'all' | KnowledgeStatus
  onChange: (v: 'all' | KnowledgeStatus) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = FILTER_OPTIONS.find((o) => o.value === value)!

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm min-w-[140px] hover:border-border/80 transition-colors"
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
              {FILTER_OPTIONS.map((opt) => (
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

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  sources: KnowledgeSourceWithUploader[]
  isAdmin: boolean
  userId:  string
}

export function KnowledgeShell({ sources, isAdmin, userId }: Props) {
  const [search, setSearch]                   = useState('')
  const [statusFilter, setStatus]             = useState<'all' | KnowledgeStatus>('all')
  const [showUpload, setShowUpload]           = useState(false)
  const [deletingId, setDeletingId]           = useState<string | null>(null)
  const [confirmSource, setConfirmSource]     = useState<KnowledgeSourceWithUploader | null>(null)

  const filtered = useMemo(() => {
    let list = sources
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((s) => s.name.toLowerCase().includes(q) || s.file_name.toLowerCase().includes(q))
    }
    if (statusFilter !== 'all') list = list.filter((s) => s.status === statusFilter)
    return list
  }, [sources, search, statusFilter])

  const handleDelete = async () => {
    if (!confirmSource) return
    setDeletingId(confirmSource.id)
    setConfirmSource(null)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/delete-knowledge`,
        {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token ?? ''}`,
          },
          body: JSON.stringify({ knowledge_source_id: confirmSource.id }),
        }
      )
      if (!res.ok) throw new Error('Delete failed')
      toast.success(`"${confirmSource.name}" deleted`)
      window.location.reload()
    } catch {
      toast.error('Delete failed. Try again.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="p-4 pt-16 lg:p-6 lg:pt-6 space-y-6 font-agent">

      {/* Header */}
      <div>
        <h1 className="font-heading text-3xl">Knowledge Base</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AI-powered knowledge sources for automated responses
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files…"
            className="w-full rounded-xl border border-border bg-card pl-9 pr-3 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>

        <StatusDropdown value={statusFilter} onChange={setStatus} />

        {isAdmin && (
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors ml-auto"
          >
            <Plus className="h-4 w-4" />
            Upload File
          </button>
        )}
      </div>

      {/* Card grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground/20 mb-3" />
          <p className="text-sm text-muted-foreground">No knowledge files found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((source, i) => (
            <motion.div
              key={source.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex flex-col rounded-2xl border border-border/50 bg-card p-4 hover:border-border transition-colors"
            >
              {/* Top: icon + status + delete */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted/40">
                  <FileIcon type={source.file_type} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                    STATUS_CONFIG[source.status].cls,
                    STATUS_CONFIG[source.status].pulse && 'animate-pulse'
                  )}>
                    {STATUS_CONFIG[source.status].label}
                  </span>
                  {isAdmin && (
                    <button
                      onClick={() => setConfirmSource(source)}
                      disabled={deletingId === source.id}
                      className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                    >
                      {deletingId === source.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />
                      }
                    </button>
                  )}
                </div>
              </div>

              {/* Name */}
              <p className="text-sm font-semibold leading-snug line-clamp-2 mb-1">
                {source.name}
              </p>

              {/* Error */}
              {source.error_msg && (
                <p className="flex items-center gap-1 text-xs text-destructive mb-1">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {source.error_msg}
                </p>
              )}

              {/* Footer: uploader + size + date */}
              <div className="mt-auto pt-4 space-y-1.5">
                {source.uploader_name && (
                  <div className="flex items-center gap-2">
                    <AvatarInitial name={source.uploader_name} />
                    <span className="text-xs text-muted-foreground truncate">{source.uploader_name}</span>
                    <span className="text-xs text-muted-foreground ml-auto shrink-0">{formatFileSize(source.file_size)}</span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{timeAgo(source.created_at)}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showUpload && <UploadModal onClose={() => setShowUpload(false)} userId={userId} />}
        {confirmSource && (
          <DeleteConfirmModal
            name={confirmSource.name}
            onCancel={() => setConfirmSource(null)}
            onConfirm={handleDelete}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteConfirmModal({
  name,
  onCancel,
  onConfirm,
}: {
  name: string
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md glass-card p-6"
      >
        <h2 className="font-heading text-xl mb-3">Delete knowledge source</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          Are you sure you want to delete{' '}
          <span className="font-semibold text-foreground">{name}</span>?{' '}
          This will remove it from the AI knowledge base permanently.
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 transition-colors"
          >
            Delete
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Upload Modal with drag & drop ─────────────────────────────────────────────
function UploadModal({ onClose, userId }: { onClose: () => void; userId: string }) {
  const [file, setFile]           = useState<File | null>(null)
  const [name, setName]           = useState('')
  const [desc, setDesc]           = useState('')
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging]   = useState(false)
  const inputRef                  = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) {
      setFile(dropped)
      if (!name) setName(dropped.name.replace(/\.[^/.]+$/, ''))
    }
  }, [name])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0]
    if (picked) {
      setFile(picked)
      if (!name) setName(picked.name.replace(/\.[^/.]+$/, ''))
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !name) return
    setUploading(true)

    try {
      const path = `${userId}/${Date.now()}_${file.name}`

      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET_KNOWLEDGE)
        .upload(path, file)
      if (storageError) throw storageError

      const { error: dbError } = await supabase.from('knowledge_sources').insert({
        name,
        description:  desc || null,
        file_name:    file.name,
        file_type:    file.type,
        file_size:    file.size,
        storage_path: path,
        status:       'uploading',
        uploaded_by:  userId,
        metadata:     {},
      })
      if (dbError) throw dbError

      toast.success('File uploaded — processing started')
      onClose()
      window.location.reload()
    } catch {
      toast.error('Upload failed. Try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg glass-card p-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading text-xl">Upload Knowledge Source</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-accent transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleUpload} className="space-y-4">
          {/* Drag & drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-10 cursor-pointer transition-colors',
              dragging
                ? 'border-primary/60 bg-primary/5'
                : file
                  ? 'border-success/40 bg-success/5'
                  : 'border-border/60 hover:border-border'
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.md,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload className={cn('h-8 w-8', file ? 'text-success' : 'text-muted-foreground')} />
            {file ? (
              <>
                <p className="text-sm font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
              </>
            ) : (
              <>
                <p className="text-sm text-foreground">Drop a file here or click to browse</p>
                <p className="text-xs text-muted-foreground">PDF, DOC, TXT, MD, CSV</p>
              </>
            )}
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="File display name"
              className="w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Description (optional)</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Brief description of this knowledge source"
              rows={2}
              className="w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none"
            />
          </div>

          {/* Upload button */}
          <button
            type="submit"
            disabled={uploading || !file || !name}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors mt-2"
          >
            {uploading
              ? <><Loader2 className="h-4 w-4 animate-spin" />Uploading…</>
              : 'Upload'
            }
          </button>
        </form>
      </motion.div>
    </motion.div>
  )
}
