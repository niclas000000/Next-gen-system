'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import {
  ArrowLeft, Save, Loader2, CheckCircle, Clock, FileText,
  History, Eye, Send, MoreHorizontal, Trash2, ShieldCheck,
  ThumbsUp, ThumbsDown, User, ChevronRight,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DocumentPropertiesForm, validateProperties } from '@/components/documents/DocumentPropertiesForm'
import type { FormField } from '@/types/field'
import { confirmDialog } from '@/components/ui/confirm'

// ---- Types ----

interface DocType {
  id: string
  name: string
  prefix: string
  format: string
  propertyPackage: unknown[]
  requireReadReceipt: boolean
  requireChangeDesc: boolean
  approvalFlow: { id: string; name: string; phases: unknown[] } | null
}

interface DocData {
  id: string
  title: string
  description: string | null
  content: string | null
  fileUrl: string | null
  fileName: string | null
  status: string
  version: string
  changeDescription: string | null
  validFrom: string | null
  validTo: string | null
  properties: Record<string, unknown>
  roles: Record<string, unknown>
  requireReadReceipt: boolean
  tags: string[]
  category: string | null
  createdAt: string
  updatedAt: string
  author: { id: string; name: string }
  documentType: DocType | null
}

interface VersionRecord {
  id: string
  version: string
  changeDesc: string
  createdAt: string
  author: { id: string; name: string }
}

interface ReceiptRecord {
  id: string
  readAt: string
  user: { id: string; name: string; email: string }
}

interface ApprovalPhase {
  id: string
  name: string
  role: string
  rule: 'any' | 'all'
  deadlineDays?: number
  order: number
}

interface UserOption { id: string; name: string; email: string }

interface ApprovalUser {
  id: string
  name: string
  email: string
}

interface ApprovalResponse {
  userId: string
  decision: 'approved' | 'rejected'
  comment?: string
  at: string
  user: ApprovalUser
}

interface ApprovalRecord {
  id: string
  phase: string
  status: 'pending' | 'approved' | 'rejected'
  assignedTo: ApprovalUser[]
  responses: ApprovalResponse[]
  startedAt: string
  completedAt: string | null
}

interface Props {
  doc: DocData
  versions: VersionRecord[]
  receipts: ReceiptRecord[]
  currentUserId: string
  hasReadReceipt: boolean
}

// ---- Status config ----

const statusVariant: Record<string, 'default' | 'warn' | 'ok'> = {
  draft: 'default', pending: 'warn', published: 'ok', archived: 'default',
}
const statusLabel: Record<string, string> = {
  draft: 'Draft', pending: 'Pending', published: 'Published', archived: 'Archived',
}

// ---- Main editor ----

export function DocumentEditor({ doc, versions, receipts, currentUserId, hasReadReceipt: initialReceipt }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'content' | 'properties' | 'history' | 'receipts' | 'approval'>('content')

  const [title, setTitle] = useState(doc.title)
  const [content, setContent] = useState(doc.content ?? '')
  const [properties, setProperties] = useState<Record<string, unknown>>(doc.properties ?? {})
  const [changeDesc, setChangeDesc] = useState('')
  const [status, setStatus] = useState(doc.status)
  const [saving, setSaving] = useState(false)
  const [savingReceipt, setSavingReceipt] = useState(false)
  const [hasReceipt, setHasReceipt] = useState(initialReceipt)
  const [versionList, setVersionList] = useState(versions)
  const isDirty = useRef(false)

  const [approvals, setApprovals] = useState<ApprovalRecord[]>([])
  const [approvalComment, setApprovalComment] = useState('')
  const [actioning, setActioning] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [submitAssignments, setSubmitAssignments] = useState<Record<number, string[]>>({})
  const [allUsers, setAllUsers] = useState<UserOption[]>([])

  const hasApprovalFlow = !!doc.documentType?.approvalFlow
  const currentApproval = approvals.find((a) => a.status === 'pending') ?? null
  const isApprover = currentApproval?.assignedTo.some((u) => u.id === currentUserId) ?? false
  const hasResponded = currentApproval?.responses.some((r) => r.userId === currentUserId) ?? false

  const fetchApprovals = useCallback(async () => {
    if (!hasApprovalFlow) return
    const res = await fetch(`/api/documents/${doc.id}/approval`)
    if (res.ok) {
      const data = await res.json() as { approvals: ApprovalRecord[] }
      setApprovals(data.approvals)
    }
  }, [doc.id, hasApprovalFlow])

  useEffect(() => { fetchApprovals() }, [fetchApprovals])

  useEffect(() => {
    if (!hasApprovalFlow) return
    fetch('/api/users').then((r) => r.json()).then((d: { users: UserOption[] }) => setAllUsers(d.users ?? [])).catch(() => {})
  }, [hasApprovalFlow])

  const [propertyErrors, setPropertyErrors] = useState<Record<string, string>>({})

  const requireChangeDesc = doc.documentType?.requireChangeDesc ?? false
  const isFile = doc.documentType?.format === 'file'
  const propertyFields = (doc.documentType?.propertyPackage ?? []) as FormField[]
  const hasPropertyFields = propertyFields.length > 0

  const save = useCallback(async (newStatus?: string) => {
    if (requireChangeDesc && !changeDesc.trim() && (title !== doc.title || content !== (doc.content ?? ''))) {
      alert('Please describe what changed before saving.')
      return
    }
    const errs = validateProperties(propertyFields, properties)
    if (Object.keys(errs).length > 0) {
      setPropertyErrors(errs)
      setTab('properties')
      return
    }
    setPropertyErrors({})
    setSaving(true)
    try {
      await fetch(`/api/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content: isFile ? undefined : content,
          properties,
          status: newStatus ?? status,
          changeDescription: changeDesc || null,
        }),
      })

      if (changeDesc.trim()) {
        const nextVersion = incrementVersion(doc.version)
        const vRes = await fetch(`/api/documents/${doc.id}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            version: nextVersion,
            content: isFile ? null : content,
            properties,
            changeDesc,
          }),
        })
        const { version: newV } = await vRes.json() as { version: VersionRecord & { author: { id: string; name: string } } }
        setVersionList((prev) => [newV, ...prev])
        setChangeDesc('')
      }

      if (newStatus) setStatus(newStatus)
      isDirty.current = false
      router.refresh()
    } finally {
      setSaving(false)
    }
  }, [title, content, properties, status, changeDesc, doc.id, doc.version, doc.content, isFile, requireChangeDesc, router])

  const openSubmitModal = () => {
    const phases = (doc.documentType?.approvalFlow?.phases ?? []) as ApprovalPhase[]
    const initial: Record<number, string[]> = {}
    phases.sort((a, b) => a.order - b.order).forEach((_, i) => { initial[i] = [] })
    setSubmitAssignments(initial)
    setShowSubmitModal(true)
  }

  const submitForApproval = async () => {
    setSaving(true)
    try {
      await fetch(`/api/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content: isFile ? undefined : content, properties }),
      })
      const res = await fetch(`/api/documents/${doc.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleAssignments: submitAssignments }),
      })
      if (res.ok) {
        setStatus('pending')
        setShowSubmitModal(false)
        setTab('approval')
        await fetchApprovals()
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  const approvePhase = async () => {
    if (!currentApproval) return
    setActioning(true)
    try {
      const res = await fetch(`/api/documents/${doc.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: approvalComment }),
      })
      const data = await res.json() as { published?: boolean; phaseComplete?: boolean }
      if (data.published) setStatus('published')
      setApprovalComment('')
      await fetchApprovals()
      router.refresh()
    } finally {
      setActioning(false)
    }
  }

  const rejectPhase = async () => {
    if (!currentApproval) return
    if (!(await confirmDialog('Reject this document? It will be returned to draft.'))) return
    setActioning(true)
    try {
      await fetch(`/api/documents/${doc.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: approvalComment }),
      })
      setStatus('draft')
      setApprovalComment('')
      await fetchApprovals()
      router.refresh()
    } finally {
      setActioning(false)
    }
  }

  const markRead = async () => {
    setSavingReceipt(true)
    try {
      await fetch(`/api/documents/${doc.id}/receipts`, { method: 'POST' })
      setHasReceipt(true)
    } finally {
      setSavingReceipt(false)
    }
  }

  const handleDelete = async () => {
    if (!(await confirmDialog(`Delete "${doc.title}"? This cannot be undone.`))) return
    await fetch(`/api/documents/${doc.id}`, { method: 'DELETE' })
    router.push('/documents')
  }

  const tabs = [
    { id: 'content', label: isFile ? 'File' : 'Content', icon: <FileText size={13} /> },
    { id: 'properties', label: 'Properties', icon: <CheckCircle size={13} />, hidden: !hasPropertyFields },
    { id: 'history', label: `History${versionList.length > 0 ? ` (${versionList.length})` : ''}`, icon: <History size={13} /> },
    { id: 'receipts', label: `Receipts${receipts.length > 0 ? ` (${receipts.length})` : ''}`, icon: <Eye size={13} />, hidden: !doc.requireReadReceipt && !doc.documentType?.requireReadReceipt },
    { id: 'approval', label: `Approval${approvals.length > 0 ? ` (${approvals.length})` : ''}`, icon: <ShieldCheck size={13} />, hidden: !hasApprovalFlow },
  ]

  return (
    <div className="flex flex-col h-full -m-6" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-3 shrink-0" style={{ borderBottom: '1px solid var(--rule)', background: 'var(--surface)' }}>
        <Link href="/documents" className="transition-colors shrink-0" style={{ color: 'var(--ink-4)' }}>
          <ArrowLeft size={18} />
        </Link>

        <div className="flex-1 min-w-0">
          <input
            value={title}
            onChange={(e) => { setTitle(e.target.value); isDirty.current = true }}
            className="text-base font-semibold bg-transparent border-0 outline-none w-full truncate"
            style={{ color: 'var(--ink)' }}
            placeholder="Document title"
          />
          <div className="flex items-center gap-2 mt-0.5">
            {doc.documentType && (
              <span className="text-xs font-mono" style={{ color: 'var(--ink-4)' }}>{doc.documentType.prefix}</span>
            )}
            <span className="text-xs font-mono" style={{ color: 'var(--ink-4)' }}>v{doc.version}</span>
            <span className="text-xs" style={{ color: 'var(--rule)' }}>·</span>
            <span className="text-xs" style={{ color: 'var(--ink-4)' }}>{doc.author.name}</span>
            <span className="text-xs" style={{ color: 'var(--rule)' }}>·</span>
            <span className="text-xs" style={{ color: 'var(--ink-4)' }}>
              {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={statusVariant[status] ?? 'default'} className="text-xs">{statusLabel[status] ?? status}</Badge>

          {/* Read receipt button for published docs */}
          {status === 'published' && (doc.requireReadReceipt || doc.documentType?.requireReadReceipt) && !hasReceipt && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              style={{ color: 'var(--ok)', borderColor: 'var(--ok)' }}
              onClick={markRead}
              disabled={savingReceipt}
            >
              {savingReceipt ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
              Mark as read
            </Button>
          )}

          {status === 'draft' && doc.documentType?.approvalFlow && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={openSubmitModal}
            >
              <Send size={11} /> Submit for approval
            </Button>
          )}

          {status === 'pending' && isApprover && !hasResponded && (
            <Button
              size="sm"
              className="h-7 text-xs gap-1"
              style={{ background: 'var(--ok)', color: '#fff' }}
              onClick={() => setTab('approval')}
            >
              <ShieldCheck size={11} /> Review
            </Button>
          )}

          <Button
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => save()}
            disabled={saving}
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            {saving ? 'Saving…' : 'Save'}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <MoreHorizontal size={15} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {status !== 'published' && (
                <DropdownMenuItem onClick={() => save('published')}>
                  <CheckCircle size={13} className="mr-2 text-green-600" /> Publish
                </DropdownMenuItem>
              )}
              {status === 'published' && (
                <DropdownMenuItem onClick={() => save('archived')}>
                  <Clock size={13} className="mr-2 text-orange-500" /> Archive
                </DropdownMenuItem>
              )}
              {status === 'archived' && (
                <DropdownMenuItem onClick={() => save('draft')}>
                  <FileText size={13} className="mr-2" /> Restore to draft
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600" onClick={handleDelete}>
                <Trash2 size={13} className="mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-6 shrink-0" style={{ borderBottom: '1px solid var(--rule)', background: 'var(--surface)' }}>
        {tabs.filter((t) => !t.hidden).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as typeof tab)}
            className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px"
            style={{
              borderColor: tab === t.id ? 'var(--nw-accent)' : 'transparent',
              color: tab === t.id ? 'var(--nw-accent)' : 'var(--ink-4)',
            }}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Content tab */}
        {tab === 'content' && (
          <div className="flex-1 overflow-y-auto p-6">
            {isFile ? (
              <div className="space-y-4">
                <p className="text-sm" style={{ color: 'var(--ink-4)' }}>This document type uses file upload.</p>
                {doc.fileUrl && (
                  <div className="flex items-center gap-3 p-3 rounded-[2px]" style={{ border: '1px solid var(--rule)' }}>
                    <FileText size={20} style={{ color: 'var(--ink-4)' }} />
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: 'var(--ink-3)' }}>{doc.fileName}</p>
                    </div>
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs hover:underline" style={{ color: 'var(--nw-accent)' }}>Open</a>
                  </div>
                )}
                {!doc.fileUrl && (
                  <div className="p-8 text-center rounded-[2px]" style={{ border: '2px dashed var(--rule)' }}>
                    <p className="text-sm" style={{ color: 'var(--ink-4)' }}>No file uploaded yet.</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--ink-4)' }}>File upload coming soon.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="max-w-3xl mx-auto">
                <RichTextEditor
                  content={content}
                  onChange={(html) => { setContent(html); isDirty.current = true }}
                  minHeight="400px"
                />
              </div>
            )}
          </div>
        )}

        {/* Properties tab */}
        {tab === 'properties' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-xl space-y-4">
              {/* Core metadata */}
              <div className="space-y-3 pb-4" style={{ borderBottom: '1px solid var(--rule)' }}>
                <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-4)' }}>Core</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Valid from</Label>
                    <input
                      type="date"
                      defaultValue={doc.validFrom?.slice(0, 10) ?? ''}
                      className="w-full h-8 px-2.5 text-sm rounded-[2px] focus:outline-none focus:ring-2"
          style={{ border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)' }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Valid to</Label>
                    <input
                      type="date"
                      defaultValue={doc.validTo?.slice(0, 10) ?? ''}
                      className="w-full h-8 px-2.5 text-sm rounded-[2px] focus:outline-none focus:ring-2"
          style={{ border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)' }}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Tags</Label>
                  <Input
                    defaultValue={doc.tags.join(', ')}
                    placeholder="quality, iso9001…"
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              {/* Type-specific properties */}
              {propertyFields.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-4)' }}>
                    {doc.documentType?.name} Properties
                  </h3>
                  <DocumentPropertiesForm
                    fields={propertyFields}
                    values={properties}
                    onChange={(name, val) => {
                      setProperties((prev) => ({ ...prev, [name]: val }))
                      isDirty.current = true
                    }}
                    errors={propertyErrors}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* History tab */}
        {tab === 'history' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-xl">
              {/* Change description input */}
              <div className="mb-6 p-4 rounded-[2px] space-y-2" style={{ background: 'var(--accent-tint)', border: '1px solid var(--nw-accent)' }}>
                <Label className="text-xs font-medium" style={{ color: 'var(--nw-accent)' }}>
                  {requireChangeDesc ? 'Change description (required)' : 'Change description (optional)'}
                </Label>
                <Input
                  value={changeDesc}
                  onChange={(e) => setChangeDesc(e.target.value)}
                  placeholder="What changed in this version?"
                  className="h-8 text-sm"
                  style={{ background: 'var(--surface)' }}
                />
                <p className="text-xs" style={{ color: 'var(--nw-accent)' }}>
                  A new version record will be created when you save with a description.
                </p>
              </div>

              {/* Version list */}
              {versionList.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--ink-4)' }}>No version history yet. Add a change description and save to create a version record.</p>
              ) : (
                <div className="space-y-3">
                  {versionList.map((v, i) => (
                    <div key={v.id} className={`flex gap-3 ${i === 0 ? '' : 'opacity-75'}`}>
                      <div className="flex flex-col items-center">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-semibold shrink-0" style={{
                          background: i === 0 ? 'var(--accent-tint)' : 'var(--paper-3)',
                          color: i === 0 ? 'var(--nw-accent)' : 'var(--ink-4)',
                        }}>
                          {v.version}
                        </div>
                        {i < versionList.length - 1 && <div className="w-px flex-1 my-1" style={{ background: 'var(--rule)' }} />}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="text-sm font-medium" style={{ color: 'var(--ink-3)' }}>{v.changeDesc}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--ink-4)' }}>
                          {v.author.name} · {format(new Date(v.createdAt), 'MMM d, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Receipts tab */}
        {tab === 'receipts' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--ink-3)' }}>Read Receipts</h3>
                <span className="text-xs" style={{ color: 'var(--ink-4)' }}>{receipts.length} confirmed</span>
              </div>

              {!hasReceipt && status === 'published' && (
                <div className="mb-4 p-3 rounded-[2px] flex items-center justify-between gap-3" style={{ background: 'oklch(0.97 0.04 70)', border: '1px solid var(--warn)' }}>
                  <p className="text-xs" style={{ color: 'var(--warn)' }}>You have not yet confirmed reading this document.</p>
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1 shrink-0"
                    style={{ background: 'var(--ok)', color: '#fff' }}
                    onClick={markRead}
                    disabled={savingReceipt}
                  >
                    {savingReceipt ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
                    Confirm read
                  </Button>
                </div>
              )}

              {receipts.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--ink-4)' }}>No read receipts yet.</p>
              ) : (
                <div className="space-y-2">
                  {receipts.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-[2px]" style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
                      <CheckCircle size={14} className="shrink-0" style={{ color: 'var(--ok)' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: 'var(--ink-3)' }}>{r.user.name}</p>
                        <p className="text-xs" style={{ color: 'var(--ink-4)' }}>{r.user.email}</p>
                      </div>
                      <span className="text-xs shrink-0" style={{ color: 'var(--ink-4)' }}>
                        {format(new Date(r.readAt), 'MMM d, yyyy')}
                      </span>
                      {r.user.id === currentUserId && (
                        <Badge variant="ok" className="text-[10px] shrink-0">You</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Approval tab */}
        {tab === 'approval' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-xl space-y-6">

              {approvals.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                  <ShieldCheck size={28} style={{ color: 'var(--ink-4)' }} />
                  <p className="text-sm" style={{ color: 'var(--ink-4)' }}>
                    {status === 'draft' ? 'Submit the document to start the approval process.' : 'No approval records yet.'}
                  </p>
                  {status === 'draft' && hasApprovalFlow && (
                    <Button size="sm" className="gap-1" onClick={submitForApproval} disabled={saving}>
                      {saving ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                      Submit for approval
                    </Button>
                  )}
                </div>
              )}

              {/* Phase list */}
              {approvals.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-4)' }}>Approval phases</h3>
                  {approvals.map((a, i) => (
                    <div key={a.id} className="rounded-[2px] overflow-hidden" style={{ border: '1px solid var(--rule)' }}>
                      {/* Phase header */}
                      <div className="flex items-center gap-3 px-4 py-3" style={{
                        background: a.status === 'pending' ? 'var(--accent-tint)' : a.status === 'approved' ? 'oklch(0.97 0.05 145)' : 'oklch(0.97 0.04 20)',
                        borderBottom: '1px solid var(--rule)',
                      }}>
                        {a.status === 'approved' && <CheckCircle size={15} style={{ color: 'var(--ok)', flexShrink: 0 }} />}
                        {a.status === 'rejected' && <ThumbsDown size={15} style={{ color: 'var(--risk)', flexShrink: 0 }} />}
                        {a.status === 'pending' && <Clock size={15} style={{ color: 'var(--nw-accent)', flexShrink: 0 }} />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                            Phase {i + 1}: {a.phase}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--ink-4)' }}>
                            {a.status === 'pending' ? 'Awaiting responses' : a.status === 'approved' ? `Approved · ${a.completedAt ? format(new Date(a.completedAt), 'MMM d, yyyy') : ''}` : `Rejected · ${a.completedAt ? format(new Date(a.completedAt), 'MMM d, yyyy') : ''}`}
                          </p>
                        </div>
                        <Badge
                          variant={a.status === 'approved' ? 'ok' : a.status === 'rejected' ? 'risk' : 'warn'}
                          className="text-[10px] shrink-0"
                        >
                          {a.status}
                        </Badge>
                      </div>

                      {/* Assignees + responses */}
                      <div className="p-4 space-y-2">
                        {a.assignedTo.map((u) => {
                          const response = a.responses.find((r) => r.userId === u.id)
                          return (
                            <div key={u.id} className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--paper-3)' }}>
                                <User size={12} style={{ color: 'var(--ink-4)' }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
                                  {u.name}{u.id === currentUserId ? ' (you)' : ''}
                                </p>
                                {response?.comment && (
                                  <p className="text-xs" style={{ color: 'var(--ink-4)' }}>{response.comment}</p>
                                )}
                              </div>
                              {response ? (
                                <Badge
                                  variant={response.decision === 'approved' ? 'ok' : 'risk'}
                                  className="text-[10px] shrink-0"
                                >
                                  {response.decision}
                                </Badge>
                              ) : (
                                <span className="text-[10px]" style={{ color: 'var(--ink-4)' }}>Pending</span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Action panel for current approver */}
              {isApprover && !hasResponded && currentApproval && (
                <div className="rounded-[2px] p-4 space-y-3" style={{ border: '1px solid var(--nw-accent)', background: 'var(--accent-tint)' }}>
                  <p className="text-xs font-semibold" style={{ color: 'var(--nw-accent)' }}>Your response — Phase: {currentApproval.phase}</p>
                  <div className="space-y-1">
                    <Label className="text-xs" style={{ color: 'var(--ink-3)' }}>Comment (optional)</Label>
                    <textarea
                      value={approvalComment}
                      onChange={(e) => setApprovalComment(e.target.value)}
                      className="w-full rounded-[2px] text-sm px-3 py-2 h-16 resize-none focus:outline-none"
                      style={{ border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)' }}
                      placeholder="Optional comment…"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="gap-1" style={{ background: 'var(--ok)', color: '#fff' }} onClick={approvePhase} disabled={actioning}>
                      {actioning ? <Loader2 size={12} className="animate-spin" /> : <ThumbsUp size={12} />}
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1" style={{ color: 'var(--risk)', borderColor: 'var(--risk)' }} onClick={rejectPhase} disabled={actioning}>
                      <ThumbsDown size={12} /> Reject
                    </Button>
                  </div>
                </div>
              )}

              {isApprover && hasResponded && (
                <p className="text-xs" style={{ color: 'var(--ink-4)' }}>You have already responded to the current phase.</p>
              )}

            </div>
          </div>
        )}

      </div>

      {/* Submit for approval modal */}
      <Dialog open={showSubmitModal} onOpenChange={(o) => { if (!o) setShowSubmitModal(false) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit for approval</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-xs" style={{ color: 'var(--ink-4)' }}>
              Assign a person to each approval phase. They will be notified to review this document.
            </p>
            {((doc.documentType?.approvalFlow?.phases ?? []) as ApprovalPhase[])
              .sort((a, b) => a.order - b.order)
              .map((phase, i) => (
                <div key={phase.id} className="space-y-1.5">
                  <Label className="text-xs">
                    Phase {i + 1}: {phase.name}
                    {phase.role && (
                      <span className="ml-1.5 font-normal" style={{ color: 'var(--ink-4)' }}>— {phase.role}</span>
                    )}
                  </Label>
                  <select
                    value={submitAssignments[i]?.[0] ?? ''}
                    onChange={(e) => setSubmitAssignments((prev) => ({ ...prev, [i]: e.target.value ? [e.target.value] : [] }))}
                    className="w-full rounded-[2px] text-sm px-3 h-8 focus:outline-none"
                    style={{ border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)' }}
                  >
                    <option value="">Select person…</option>
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} — {u.email}</option>
                    ))}
                  </select>
                </div>
              ))}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setShowSubmitModal(false)}>Cancel</Button>
              <Button size="sm" onClick={submitForApproval} disabled={saving} className="gap-1">
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                Submit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function incrementVersion(version: string): string {
  const parts = version.split('.')
  if (parts.length < 2) return `${version}.1`
  const minor = parseInt(parts[1], 10) + 1
  return `${parts[0]}.${minor}`
}
