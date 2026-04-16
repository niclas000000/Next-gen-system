'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { FileInput, Search, Loader2 } from 'lucide-react'
import type { FormField } from '@/types/field'

interface StandaloneForm {
  id: string
  name: string
  description: string | null
  fields: FormField[]
  updatedAt: string
}

interface Props {
  open: boolean
  onClose: () => void
  onImport: (fields: FormField[], mode: 'replace' | 'append') => void
}

export function ImportFormDialog({ open, onClose, onImport }: Props) {
  const [forms, setForms] = useState<StandaloneForm[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [mode, setMode] = useState<'replace' | 'append'>('replace')

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/api/forms')
      .then((r) => r.json())
      .then((d) => { setForms(d.forms ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [open])

  const filtered = forms.filter((f) =>
    !search || f.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleImport = () => {
    const form = forms.find((f) => f.id === selected)
    if (!form) return
    onImport(form.fields, mode)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Use existing form</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-slate-500 -mt-2">
          Pick a form from your library to load its fields into this task node.
        </p>

        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Search forms…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
            autoFocus
          />
        </div>

        <div className="border border-slate-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={18} className="animate-spin text-slate-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">
              {forms.length === 0 ? 'No forms in library yet.' : 'No forms match your search.'}
            </div>
          ) : (
            filtered.map((form) => {
              const fieldCount = Array.isArray(form.fields)
                ? form.fields.filter((f: FormField) => !['section', 'heading', 'divider'].includes(f.type)).length
                : 0
              return (
                <button
                  key={form.id}
                  onClick={() => setSelected(form.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-slate-100 last:border-0 transition-colors ${
                    selected === form.id ? 'bg-blue-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className={`p-1.5 rounded ${selected === form.id ? 'bg-blue-100' : 'bg-slate-100'}`}>
                    <FileInput size={14} className={selected === form.id ? 'text-blue-600' : 'text-slate-500'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{form.name}</p>
                    {form.description && (
                      <p className="text-xs text-slate-400 truncate">{form.description}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {fieldCount} field{fieldCount !== 1 ? 's' : ''}
                  </Badge>
                </button>
              )
            })
          )}
        </div>

        {/* Replace vs append */}
        <div className="flex gap-2">
          {(['replace', 'append'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-1.5 rounded text-xs font-medium border transition-colors ${
                mode === m ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:border-blue-300'
              }`}
            >
              {m === 'replace' ? 'Replace current fields' : 'Append to current fields'}
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleImport}
            disabled={!selected}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Load form
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
