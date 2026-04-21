'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  FileText, Plus, Search, Clock, User, FileInput, FileCheck,
  FileClock, FileX, FileQuestion, Loader2, Library, Archive,
} from 'lucide-react'
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

const PREDEFINED_VIEWS = [
  { label: 'Library',          href: '/documents',                  icon: <Library size={14} /> },
  { label: 'Pending Approval', href: '/documents?status=pending',   icon: <Clock size={14} /> },
  { label: 'My Documents',     href: '/documents?view=mine',        icon: <User size={14} /> },
  { label: 'Drafts',           href: '/documents?status=draft',     icon: <FileInput size={14} /> },
  { label: 'Archived',         href: '/documents?status=archived',  icon: <Archive size={14} /> },
]

function ViewNav({ onNew }: { onNew: () => void }) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const isCurrent = (href: string) => {
    const url = new URL(href, 'http://x')
    const status = url.searchParams.get('status')
    const view = url.searchParams.get('view')
    return (
      url.pathname === '/documents' &&
      (status ?? '') === (searchParams.get('status') ?? '') &&
      (view ?? '') === (searchParams.get('view') ?? '')
    )
  }

  return (
    <aside className="w-52 shrink-0 flex flex-col" style={{ background: 'var(--paper-2)', borderRight: '1px solid var(--rule)' }}>
      <div className="p-3" style={{ borderBottom: '1px solid var(--rule)' }}>
        <Button onClick={onNew} className="w-full gap-2 h-8 text-xs">
          <Plus size={13} />
          New document
        </Button>
      </div>
      <div className="px-3 pt-3 pb-1">
        <p className="mono-meta text-[10px]">Views</p>
      </div>
      <nav className="flex-1 overflow-y-auto sidebar-scroll p-1.5 space-y-0.5">
        {PREDEFINED_VIEWS.map((v) => {
          const active = isCurrent(v.href)
          return (
            <button
              key={v.href}
              onClick={() => router.push(v.href)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[2px] text-sm transition-colors text-left"
              style={{
                color: active ? 'var(--nw-accent)' : 'var(--ink-3)',
                background: active ? 'var(--accent-tint)' : '',
                fontWeight: active ? '500' : '400',
                borderLeft: active ? '2px solid var(--nw-accent)' : '2px solid transparent',
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--paper-3)' }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = '' }}
            >
              {v.icon}
              {v.label}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}

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
        <DialogHeader>
          <DialogTitle>New document</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">Title</label>
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
              <label className="text-xs font-medium text-slate-700">Document type</label>
              <select
                value={typeId}
                onChange={(e) => setTypeId(e.target.value)}
                className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <Button
              onClick={handleCreate}
              disabled={!title.trim() || creating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {creating && <Loader2 size={14} className="animate-spin mr-1" />}
              Create
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function DocumentsClient({
  initialDocuments,
  documentTypes,
  currentStatus,
  currentView,
}: Props) {
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)

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
    <div className="flex -m-6 h-[calc(100vh-56px)]">
      {/* Left panel — same pattern as Cases */}
      <ViewNav onNew={() => setShowNew(true)} />

      {/* Right panel — document list */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--paper)' }}>
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-5 py-2.5 shrink-0" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--rule)' }}>
          <h2 className="text-sm font-semibold flex-1" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>{pageTitle}</h2>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--ink-4)' }} />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="pl-8 h-7 text-xs w-44"
            />
          </div>
          <span className="text-xs shrink-0 mono-meta">{filtered.length} doc{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <FileQuestion size={32} className="text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium text-sm">
                {search ? 'No documents match your search.' : 'No documents here yet.'}
              </p>
              {!search && (
                <Button size="sm" className="mt-3 bg-blue-600 hover:bg-blue-700 gap-1.5" onClick={() => setShowNew(true)}>
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
                    className="flex items-center gap-3 px-4 py-3 bg-white border border-[#E8E6DF] rounded-[2px] hover:border-[oklch(0.52_0.08_200)] transition-all group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-[#111] group-hover:text-[oklch(0.52_0.08_200)] transition-colors truncate">
                          {doc.documentType && (
                            <span className="font-mono text-xs text-[#8A877F] mr-1.5">{doc.documentType.prefix}</span>
                          )}
                          {doc.title}
                        </p>
                        <Badge variant={cfg.variant} className="text-[10px] flex items-center gap-1 shrink-0">
                          {cfg.icon}{cfg.label}
                        </Badge>
                        {doc.documentType && (
                          <span className="text-[10px] bg-[var(--accent-tint)] text-[oklch(0.42_0.08_200)] border border-[oklch(0.80_0.05_200)] rounded-full px-2 py-0.5 shrink-0">
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

      <NewDocumentDialog open={showNew} onClose={() => setShowNew(false)} documentTypes={documentTypes} />
    </div>
  )
}
