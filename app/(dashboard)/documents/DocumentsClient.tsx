'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Clock, FileCheck, FileClock, FileX, FileQuestion, Loader2, Plus, Search } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Doc {
  id: string
  title: string
  description: string | null
  category: string | null
  tags: string[]
  status: string
  version: string
  createdAt: string
  updatedAt: string
  author: { id: string; name: string }
  documentType: { id: string; name: string; prefix: string } | null
}

interface DocType {
  id: string
  name: string
  prefix: string
  format: string
}

interface Props {
  initialDocuments: Doc[]
  documentTypes: DocType[]
  currentStatus: string | null
  currentView: string | null
  userId: string
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'ok' | 'warn' | 'risk'; icon: React.ReactNode }> = {
  draft:     { label: 'Draft',     variant: 'default', icon: <FileClock size={10} /> },
  pending:   { label: 'Pending',   variant: 'warn',    icon: <Clock size={10} /> },
  published: { label: 'Published', variant: 'ok',      icon: <FileCheck size={10} /> },
  archived:  { label: 'Archived',  variant: 'default', icon: <FileX size={10} /> },
}

// ---------------------------------------------------------------------------
// New document dialog
// ---------------------------------------------------------------------------
function NewDocumentDialog({
  open,
  onClose,
  documentTypes,
}: {
  open: boolean
  onClose: () => void
  documentTypes: DocType[]
}) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [typeId, setTypeId] = useState(documentTypes[0]?.id ?? '')
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!title.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), documentTypeId: typeId || null, status: 'draft' }),
      })
      const data = await res.json() as { document: { id: string } }
      onClose()
      router.push(`/documents/${data.document.id}`)
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>New document</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>Title</label>
            <Input
              placeholder="Document title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className="h-9 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
          {documentTypes.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>Document type</label>
              <select
                value={typeId}
                onChange={(e) => setTypeId(e.target.value)}
                className="w-full h-9 px-3 text-sm rounded-[2px] focus:outline-none"
                style={{ border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)' }}
              >
                <option value="">No type</option>
                {documentTypes.map((t) => (
                  <option key={t.id} value={t.id}>{t.prefix} — {t.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!title.trim() || creating}>
              {creating && <Loader2 size={14} className="animate-spin mr-1" />}
              Create
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function DocumentsClient({
  initialDocuments,
  documentTypes,
  currentStatus,
  currentView,
}: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [search, setSearch]         = useState('')
  const [showNew, setShowNew]       = useState(searchParams.get('new') === '1')

  const filtered = initialDocuments.filter((d) => {
    if (!search) return true
    return (
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.description?.toLowerCase().includes(search.toLowerCase()) ||
      d.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())) ||
      d.documentType?.name.toLowerCase().includes(search.toLowerCase())
    )
  })

  const pageTitle =
    currentStatus === 'pending'  ? 'Pending Approval' :
    currentStatus === 'draft'    ? 'Drafts' :
    currentStatus === 'archived' ? 'Archived' :
    currentView === 'mine'       ? 'My Documents' :
    'Document Library'

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mono-meta">Documents</p>
          <h1 className="text-2xl font-semibold text-ink font-display">{pageTitle}</h1>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus size={14} /> New document
        </Button>
      </div>

      <div className="rounded-[2px] border border-rule bg-surface">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-rule">
          <div className="relative flex-1 max-w-sm">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--ink-4)' }} />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="pl-8 h-8 text-sm"
            />
          </div>
          <span className="ml-auto text-xs shrink-0 text-ink-4">{filtered.length} document{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* List */}
        <div className="p-3">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileQuestion size={32} className="mb-3" style={{ color: 'var(--ink-4)' }} />
              <p className="font-medium text-sm" style={{ color: 'var(--ink-3)' }}>
                {search ? 'No documents match your search.' : 'No documents here yet.'}
              </p>
              {!search && (
                <Button size="sm" className="mt-3 gap-1.5" onClick={() => setShowNew(true)}>
                  <Plus size={13} /> New document
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              {filtered.map((doc) => {
                const cfg = statusConfig[doc.status] ?? statusConfig.draft
                return (
                  <Link
                    key={doc.id}
                    href={`/documents/${doc.id}`}
                    className="flex items-center gap-3 px-4 py-3 rounded-[2px] transition-colors group border border-rule bg-surface hover:border-nw-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nw-accent"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>
                          {doc.documentType && (
                            <span className="font-mono text-xs mr-1.5" style={{ color: 'var(--ink-4)' }}>{doc.documentType.prefix}</span>
                          )}
                          {doc.title}
                        </p>
                        <Badge variant={cfg.variant} className="text-[10px] flex items-center gap-1 shrink-0">
                          {cfg.icon}{cfg.label}
                        </Badge>
                        {doc.documentType && (
                          <span className="text-[10px] rounded-full px-2 py-0.5 shrink-0" style={{ background: 'var(--accent-tint)', color: 'var(--nw-accent)' }}>
                            {doc.documentType.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5" style={{ color: 'var(--ink-4)', fontSize: '11px' }}>
                        <span>{doc.author.name}</span>
                        <span>·</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>v{doc.version}</span>
                        <span>·</span>
                        <span>{formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}</span>
                        {doc.tags.length > 0 && (
                          <><span>·</span><span>{doc.tags.slice(0, 2).join(', ')}{doc.tags.length > 2 ? '…' : ''}</span></>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <NewDocumentDialog
        open={showNew}
        onClose={() => {
          setShowNew(false)
          if (searchParams.get('new')) router.replace('/documents')
        }}
        documentTypes={documentTypes}
      />
    </div>
  )
}
