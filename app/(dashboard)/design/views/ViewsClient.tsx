'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Trash2, Edit2, Loader2, LayoutList } from 'lucide-react'

interface SystemView {
  id: string
  name: string
  section: string
  icon: string
  filters: Record<string, string>
  order: number
  isDefault: boolean
}

interface Props {
  initialViews: SystemView[]
}

const SECTIONS = ['cases', 'documents'] as const
type Section = typeof SECTIONS[number]

const SECTION_LABEL: Record<Section, string> = {
  cases: 'Cases',
  documents: 'Documents',
}

const ICONS = [
  'List', 'Clock', 'CheckCircle', 'User', 'GitBranch', 'FileText',
  'Archive', 'FileInput', 'Library', 'Star', 'Bookmark', 'FileX',
  'Layers', 'Filter', 'Shield', 'Bell', 'Tag', 'Search', 'AlertCircle',
]

// Cases: status options + view options
const CASES_STATUS = ['', 'running', 'completed', 'cancelled', 'error']
const CASES_VIEW   = ['', 'mine', 'by-workflow']
const DOCS_STATUS  = ['', 'draft', 'pending', 'published', 'archived']
const DOCS_VIEW    = ['', 'mine']

function FiltersEditor({
  section,
  filters,
  onChange,
}: {
  section: Section
  filters: Record<string, string>
  onChange: (f: Record<string, string>) => void
}) {
  const statusOptions = section === 'cases' ? CASES_STATUS : DOCS_STATUS
  const viewOptions   = section === 'cases' ? CASES_VIEW   : DOCS_VIEW

  const set = (key: string, val: string) => {
    const next = { ...filters }
    if (val) next[key] = val
    else delete next[key]
    onChange(next)
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1">
        <Label className="text-xs">Status filter</Label>
        <select
          value={filters.status ?? ''}
          onChange={(e) => set('status', e.target.value)}
          className="w-full h-8 px-2.5 text-sm rounded-[2px] focus:outline-none"
          style={{ border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)' }}
        >
          <option value="">All statuses</option>
          {statusOptions.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">View filter</Label>
        <select
          value={filters.view ?? ''}
          onChange={(e) => set('view', e.target.value)}
          className="w-full h-8 px-2.5 text-sm rounded-[2px] focus:outline-none"
          style={{ border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)' }}
        >
          {viewOptions.map((v) => (
            <option key={v} value={v}>{v === '' ? 'None' : v === 'mine' ? 'Mine only' : 'Per workflow'}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

function ViewDialog({
  open,
  view,
  section,
  onClose,
  onSaved,
}: {
  open: boolean
  view: SystemView | null
  section: Section
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName]       = useState(view?.name ?? '')
  const [icon, setIcon]       = useState(view?.icon ?? 'List')
  const [filters, setFilters] = useState<Record<string, string>>(view?.filters ?? {})
  const [saving, setSaving]   = useState(false)

  const reset = () => {
    setName(view?.name ?? '')
    setIcon(view?.icon ?? 'List')
    setFilters(view?.filters ?? {})
  }

  const save = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      if (view) {
        await fetch(`/api/system-views/${view.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, icon, filters }),
        })
      } else {
        await fetch('/api/system-views', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, icon, filters, section }),
        })
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose() } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{view ? 'Edit view' : `New ${SECTION_LABEL[section]} view`}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. High priority"
              className="h-8 text-sm"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Icon</Label>
            <div className="flex flex-wrap gap-1.5 p-2 rounded-[2px]" style={{ border: '1px solid var(--rule)', background: 'var(--paper-2)' }}>
              {ICONS.map((ic) => (
                <button
                  key={ic}
                  onClick={() => setIcon(ic)}
                  className="px-2 py-0.5 text-xs rounded-[2px] transition-colors"
                  style={{
                    background: icon === ic ? 'var(--nw-accent)' : 'var(--surface)',
                    color: icon === ic ? '#fff' : 'var(--ink-3)',
                    border: `1px solid ${icon === ic ? 'var(--nw-accent)' : 'var(--rule)'}`,
                  }}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Filters</Label>
            <FiltersEditor section={section} filters={filters} onChange={setFilters} />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={save} disabled={!name.trim() || saving}>
              {saving && <Loader2 size={13} className="animate-spin mr-1" />}
              {view ? 'Save changes' : 'Create view'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function ViewsClient({ initialViews }: Props) {
  const router = useRouter()
  const [views, setViews] = useState<SystemView[]>(initialViews)
  const [activeSection, setActiveSection] = useState<Section>('cases')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<SystemView | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const sectionViews = views
    .filter((v) => v.section === activeSection)
    .sort((a, b) => a.order - b.order)

  const openNew = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const openEdit = (v: SystemView) => {
    setEditing(v)
    setDialogOpen(true)
  }

  const handleSaved = () => {
    setDialogOpen(false)
    router.refresh()
    fetch('/api/system-views')
      .then((r) => r.json())
      .then((d: { views: SystemView[] }) => setViews(d.views))
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this view?')) return
    setDeleting(id)
    try {
      await fetch(`/api/system-views/${id}`, { method: 'DELETE' })
      setViews((prev) => prev.filter((v) => v.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  const filterSummary = (v: SystemView) => {
    const parts: string[] = []
    if (v.filters.status) parts.push(`status: ${v.filters.status}`)
    if (v.filters.view)   parts.push(`view: ${v.filters.view}`)
    return parts.length ? parts.join(', ') : 'All'
  }

  return (
    <>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>Navigation Views</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--ink-4)' }}>
              Configure which views appear in the sidebar for Cases and Documents. Default views can be renamed but not deleted.
            </p>
          </div>
          <Button onClick={openNew} className="gap-2 shrink-0">
            <Plus size={15} /> New view
          </Button>
        </div>

        {/* Section tabs */}
        <div className="flex gap-1" style={{ borderBottom: '1px solid var(--rule)' }}>
          {SECTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              className="px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px"
              style={{
                borderColor: activeSection === s ? 'var(--nw-accent)' : 'transparent',
                color: activeSection === s ? 'var(--nw-accent)' : 'var(--ink-4)',
              }}
            >
              {SECTION_LABEL[s]}
            </button>
          ))}
        </div>

        {/* View list */}
        {sectionViews.length === 0 ? (
          <div className="py-14 text-center rounded-[2px]" style={{ border: '1px dashed var(--rule)', background: 'var(--paper-2)' }}>
            <LayoutList size={26} className="mx-auto mb-3" style={{ color: 'var(--ink-4)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--ink-3)' }}>No views yet</p>
            <p className="text-xs mt-1 mb-4" style={{ color: 'var(--ink-4)' }}>Create a view to add it to the sidebar navigation.</p>
            <Button onClick={openNew} className="gap-1.5">
              <Plus size={13} /> New view
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {sectionViews.map((v, i) => (
              <Card key={v.id}>
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono w-5 text-right shrink-0" style={{ color: 'var(--ink-4)' }}>{i + 1}</span>
                    <CardTitle className="text-sm font-medium flex-1">{v.name}</CardTitle>
                    <span className="text-xs font-mono" style={{ color: 'var(--ink-4)' }}>{v.icon}</span>
                    <Badge variant="default" className="text-xs font-mono">{filterSummary(v)}</Badge>
                    {v.isDefault && (
                      <Badge variant="ok" className="text-xs">Default</Badge>
                    )}
                    <button
                      onClick={() => openEdit(v)}
                      className="p-1 transition-colors shrink-0"
                      style={{ color: 'var(--ink-4)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ink)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-4)')}
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(v.id)}
                      disabled={v.isDefault || deleting === v.id}
                      className="p-1 transition-colors shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{ color: 'var(--ink-4)' }}
                      onMouseEnter={(e) => { if (!v.isDefault) e.currentTarget.style.color = 'var(--risk)' }}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-4)')}
                      title={v.isDefault ? 'Default views cannot be deleted' : 'Delete'}
                    >
                      {deleting === v.id
                        ? <Loader2 size={13} className="animate-spin" />
                        : <Trash2 size={13} />}
                    </button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ViewDialog
        open={dialogOpen}
        view={editing}
        section={activeSection}
        onClose={() => setDialogOpen(false)}
        onSaved={handleSaved}
      />
    </>
  )
}
