'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Search, FileText, FileType2, File, Plus, RefreshCw, Trash2, AlertCircle, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatFileSize, timeAgo } from '@/lib/utils'
import { supabase } from '@/server/supabase/client'
import { STORAGE_BUCKET_KNOWLEDGE } from '@/lib/constants'
import type { KnowledgeSourceWithUploader, KnowledgeStatus } from '@/types'

const STATUS_CONFIG: Record<KnowledgeStatus, { cls: string; label: string; pulse?: boolean }> = {
  uploading:  { cls: 'bg-muted text-muted-foreground',          label: 'Uploading'   },
  processing: { cls: 'bg-warning/20 text-warning',              label: 'Processing', pulse: true },
  ready:      { cls: 'bg-success/20 text-success',              label: 'Ready'       },
  failed:     { cls: 'bg-destructive/20 text-destructive',      label: 'Failed'      },
  deleted:    { cls: 'bg-muted text-muted-foreground',          label: 'Deleted'     },
}

function FileIcon({ type }: { type: string }) {
  if (type.includes('pdf'))  return <FileText className="h-5 w-5 text-destructive" />
  if (type.includes('word')) return <FileType2 className="h-5 w-5 text-primary" />
  return <File className="h-5 w-5 text-muted-foreground" />
}

interface Props {
  sources: KnowledgeSourceWithUploader[]
  isAdmin: boolean
  userId:  string
}

export function KnowledgeShell({ sources, isAdmin, userId }: Props) {
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatus]   = useState<'all' | KnowledgeStatus>('all')
  const [showUpload, setShowUpload] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let list = sources
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((s) => s.name.toLowerCase().includes(q) || s.file_name.toLowerCase().includes(q))
    }
    if (statusFilter !== 'all') list = list.filter((s) => s.status === statusFilter)
    return list
  }, [sources, search, statusFilter])

  const handleDelete = async (source: KnowledgeSourceWithUploader) => {
    if (!confirm(`Delete "${source.name}"? This cannot be undone.`)) return
    setDeletingId(source.id)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/delete-knowledge`,
        {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token ?? ''}`,
          },
          body: JSON.stringify({ knowledge_source_id: source.id }),
        }
      )
      if (!res.ok) throw new Error('Delete failed')
      toast.success(`"${source.name}" deleted`)
      // Refresh: simple reload — in production use router.refresh()
      window.location.reload()
    } catch (err) {
      toast.error('Delete failed. Try again.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="p-4 pt-16 lg:p-6 lg:pt-6 space-y-6 font-agent">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl">Knowledge Base</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {sources.filter((s) => s.status === 'ready').length} of {sources.length} files ready
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Upload File
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files…"
            className="w-full rounded-xl border border-border bg-input pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatus(e.target.value as 'all' | KnowledgeStatus)}
          className="rounded-xl border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
        >
          <option value="all">All status</option>
          <option value="ready">Ready</option>
          <option value="processing">Processing</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* File list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground">No knowledge files found</p>
          </div>
        ) : (
          filtered.map((source) => (
            <div
              key={source.id}
              className="flex items-center gap-4 rounded-xl border border-border/50 bg-card px-4 py-3 hover:border-border transition-colors"
            >
              <FileIcon type={source.file_type} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{source.name}</p>
                  <span className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
                    STATUS_CONFIG[source.status].cls,
                    STATUS_CONFIG[source.status].pulse && 'animate-pulse'
                  )}>
                    {STATUS_CONFIG[source.status].label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {source.file_name} · {formatFileSize(source.file_size)} · {timeAgo(source.created_at)}
                  {source.uploader_name && ` · by ${source.uploader_name}`}
                </p>
                {source.error_msg && (
                  <p className="flex items-center gap-1 text-xs text-destructive mt-1">
                    <AlertCircle className="h-3 w-3" />
                    {source.error_msg}
                  </p>
                )}
              </div>
              {isAdmin && (
                <button
                  onClick={() => handleDelete(source)}
                  disabled={deletingId === source.id}
                  className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                >
                  {deletingId === source.id
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Trash2 className="h-4 w-4" />
                  }
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <AnimatePresence>
        {showUpload && <UploadModal onClose={() => setShowUpload(false)} userId={userId} />}
      </AnimatePresence>
    </div>
  )
}

// ── Upload Modal ──────────────────────────────────────────────────────────────
function UploadModal({ onClose, userId }: { onClose: () => void; userId: string }) {
  const [file, setFile]         = useState<File | null>(null)
  const [name, setName]         = useState('')
  const [desc, setDesc]         = useState('')
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !name) return
    setUploading(true)

    try {
      const path = `${userId}/${Date.now()}_${file.name}`

      // 1. Upload to Supabase Storage
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET_KNOWLEDGE)
        .upload(path, file)

      if (storageError) throw storageError

      // 2. Create knowledge_sources record
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
    } catch (err) {
      toast.error('Upload failed. Try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md glass-card p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-xl">Upload Knowledge File</h2>
          <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Name</label>
            <input
              value={name} onChange={(e) => setName(e.target.value)}
              required placeholder="e.g. Getting Started Guide"
              className="w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description (optional)</label>
            <input
              value={desc} onChange={(e) => setDesc(e.target.value)}
              placeholder="Brief description"
              className="w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">File (PDF, DOCX, TXT)</label>
            <input
              type="file" accept=".pdf,.doc,.docx,.txt"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
              className="w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary/15 file:text-primary file:text-xs file:font-medium file:px-2 file:py-1"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-accent transition-colors">
              Cancel
            </button>
            <button
              type="submit" disabled={uploading || !file || !name}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {uploading ? <><Loader2 className="h-4 w-4 animate-spin" />Uploading…</> : 'Upload'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
