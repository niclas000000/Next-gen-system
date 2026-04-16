'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import {
  FileText, Plus, Search, Pencil, Trash2, Eye,
  FileCheck, FileClock, FileX,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Doc {
  id: string
  title: string
  description: string | null
  category: string | null
  tags: string[]
  content?: string | null
  status: string
  version: number
  createdAt: string
  updatedAt: string
  author: { id: string; name: string }
}

interface Props {
  initialDocuments: Doc[]
}

const statusConfig: Record<string, { label: string; class: string; icon: React.ReactNode }> = {
  draft:     { label: 'Draft',     class: 'bg-slate-100 text-slate-600 border-slate-200',    icon: <FileClock size={11} /> },
  published: { label: 'Published', class: 'bg-green-100 text-green-700 border-green-200',    icon: <FileCheck size={11} /> },
  archived:  { label: 'Archived',  class: 'bg-orange-100 text-orange-700 border-orange-200', icon: <FileX size={11} /> },
}

type FormState = { title: string; description: string; category: string; tags: string; status: string; content: string }
const emptyForm: FormState = { title: '', description: '', category: '', tags: '', status: 'draft', content: '' }

const CATEGORIES = ['Policy', 'Procedure', 'Template', 'Guide', 'Report', 'Contract', 'Other']

export function DocumentsClient({ initialDocuments }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [docs, setDocs] = useState(initialDocuments)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [editDoc, setEditDoc] = useState<Doc | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [viewDoc, setViewDoc] = useState<Doc | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const refresh = () => startTransition(() => router.refresh())

  const filtered = docs.filter((d) => {
    const matchSearch = !search ||
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.description?.toLowerCase().includes(search.toLowerCase()) ||
      d.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
    const matchStatus = filterStatus === 'all' || d.status === filterStatus
    return matchSearch && matchStatus
  })

  const openCreate = () => {
    setForm(emptyForm)
    setError('')
    setShowCreate(true)
  }

  const openEdit = (d: Doc) => {
    setForm({
      title: d.title,
      description: d.description ?? '',
      category: d.category ?? '',
      tags: d.tags.join(', '),
      status: d.status,
      content: d.content ?? '',
    })
    setError('')
    setEditDoc(d)
  }

  const tagsArray = (raw: string) => raw.split(',').map((t) => t.trim()).filter(Boolean)

  const handleCreate = async () => {
    setSaving(true)
    setError('')
    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title,
        description: form.description || null,
        category: form.category || null,
        tags: tagsArray(form.tags),
        status: form.status,
        content: form.content || null,
      }),
    })
    setSaving(false)
    if (!res.ok) { setError((await res.json() as { error: string }).error); return }
    const { document: doc } = await res.json() as { document: Doc }
    setDocs((prev) => [doc, ...prev])
    setShowCreate(false)
    refresh()
  }

  const handleSaveEdit = async () => {
    if (!editDoc) return
    setSaving(true)
    setError('')
    const res = await fetch(`/api/documents/${editDoc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title,
        description: form.description || null,
        category: form.category || null,
        tags: tagsArray(form.tags),
        status: form.status,
        content: form.content || null,
      }),
    })
    setSaving(false)
    if (!res.ok) { setError((await res.json() as { error: string }).error); return }
    const { document: doc } = await res.json() as { document: Doc }
    setDocs((prev) => prev.map((d) => d.id === doc.id ? doc : d))
    setEditDoc(null)
    refresh()
  }

  const handleDelete = async (d: Doc) => {
    if (!confirm(`Delete "${d.title}"?`)) return
    setDocs((prev) => prev.filter((x) => x.id !== d.id))
    await fetch(`/api/documents/${d.id}`, { method: 'DELETE' })
    refresh()
  }

  const formFields = (onSave: () => void, onClose: () => void) => (
    <div className="space-y-4 py-2">
      <div className="space-y-1">
        <Label className="text-xs">Title</Label>
        <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Document title" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Description <span className="text-slate-400 font-normal">(optional)</span></Label>
        <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Brief description" rows={2} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Category</Label>
          <select
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            className="w-full rounded-md border border-slate-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">No category</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            className="w-full rounded-md border border-slate-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Tags <span className="text-slate-400 font-normal">(comma-separated)</span></Label>
        <Input value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} placeholder="quality, iso9001, hr" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Content <span className="text-slate-400 font-normal">(optional)</span></Label>
        <RichTextEditor
          content={form.content}
          onChange={(html) => setForm((f) => ({ ...f, content: html }))}
          minHeight="160px"
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <DialogFooter>
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={onSave} disabled={saving || !form.title}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogFooter>
    </div>
  )

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Documents</h1>
          <p className="text-sm text-slate-500 mt-1">Policies, procedures, templates and more.</p>
        </div>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 gap-1.5" onClick={openCreate}>
          <Plus size={14} />
          New document
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search documents..." className="pl-8 text-sm" />
        </div>
        <div className="flex gap-1">
          {['all', 'draft', 'published', 'archived'].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filterStatus === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300'
              }`}
            >
              {s === 'all' ? 'All' : statusConfig[s]?.label ?? s}
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-4 text-sm text-slate-500">
        <span>{docs.length} total</span>
        <span>·</span>
        <span className="text-green-600">{docs.filter((d) => d.status === 'published').length} published</span>
        <span>·</span>
        <span className="text-slate-400">{docs.filter((d) => d.status === 'draft').length} drafts</span>
      </div>

      {/* Document list */}
      {filtered.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-slate-100 mb-4">
              <FileText size={24} className="text-slate-400" />
            </div>
            <p className="font-medium text-slate-700">{search ? 'No documents match your search.' : 'No documents yet.'}</p>
            {!search && (
              <Button size="sm" className="mt-4 bg-blue-600 hover:bg-blue-700 gap-1.5" onClick={openCreate}>
                <Plus size={14} /> New document
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((d) => {
            const cfg = statusConfig[d.status] ?? statusConfig.draft
            return (
              <Card key={d.id} className="shadow-sm hover:shadow-md transition-all duration-200">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-slate-50 shrink-0">
                    <FileText size={18} className="text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-slate-800 text-sm">{d.title}</p>
                      <Badge variant="outline" className={`text-xs flex items-center gap-1 ${cfg.class}`}>
                        {cfg.icon}{cfg.label}
                      </Badge>
                      {d.category && (
                        <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 rounded px-1.5 py-0.5">{d.category}</span>
                      )}
                    </div>
                    {d.description && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{d.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
                      <span>{d.author.name}</span>
                      <span>·</span>
                      <span>v{d.version}</span>
                      <span>·</span>
                      <span>{formatDistanceToNow(new Date(d.updatedAt), { addSuffix: true })}</span>
                      {d.tags.length > 0 && (
                        <>
                          <span>·</span>
                          <span>{d.tags.slice(0, 3).join(', ')}{d.tags.length > 3 ? '…' : ''}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-600" onClick={() => setViewDoc(d)} title="View">
                      <Eye size={13} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-600" onClick={() => openEdit(d)} title="Edit">
                      <Pencil size={13} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500" onClick={() => handleDelete(d)} title="Delete">
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={(o) => !o && setShowCreate(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New document</DialogTitle></DialogHeader>
          {formFields(handleCreate, () => setShowCreate(false))}
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editDoc} onOpenChange={(o) => !o && setEditDoc(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit document</DialogTitle></DialogHeader>
          {formFields(handleSaveEdit, () => setEditDoc(null))}
        </DialogContent>
      </Dialog>

      {/* View dialog */}
      <Dialog open={!!viewDoc} onOpenChange={(o) => !o && setViewDoc(null)}>
        <DialogContent className="max-w-2xl">
          {viewDoc && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {viewDoc.title}
                  <Badge variant="outline" className={`text-xs ${statusConfig[viewDoc.status]?.class}`}>
                    {statusConfig[viewDoc.status]?.label}
                  </Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="flex gap-4 text-xs text-slate-500">
                  <span>By {viewDoc.author.name}</span>
                  <span>·</span>
                  <span>Version {viewDoc.version}</span>
                  {viewDoc.category && <><span>·</span><span>{viewDoc.category}</span></>}
                  <span>·</span>
                  <span>Updated {formatDistanceToNow(new Date(viewDoc.updatedAt), { addSuffix: true })}</span>
                </div>
                {viewDoc.description && (
                  <p className="text-sm text-slate-600">{viewDoc.description}</p>
                )}
                {viewDoc.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {viewDoc.tags.map((tag) => (
                      <span key={tag} className="text-[10px] bg-slate-100 text-slate-600 rounded px-2 py-0.5">{tag}</span>
                    ))}
                  </div>
                )}
                <div className="border-t border-slate-100 pt-4">
                  {viewDoc.content ? (
                    <RichTextEditor
                      content={viewDoc.content}
                      editable={false}
                      minHeight="120px"
                    />
                  ) : (
                    <p className="text-sm text-slate-400 italic">No content.</p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => { setViewDoc(null); openEdit(viewDoc) }}>
                  <Pencil size={13} className="mr-1.5" /> Edit
                </Button>
                <Button size="sm" onClick={() => setViewDoc(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
