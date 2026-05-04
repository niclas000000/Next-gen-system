'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Loader2 } from 'lucide-react'

export function NewDocumentTypeButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [prefix, setPrefix] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!name.trim() || !prefix.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/document-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), prefix: prefix.trim().toUpperCase() }),
      })
      const data = await res.json() as { type: { id: string } }
      setOpen(false)
      setName('')
      setPrefix('')
      router.push(`/design/document-types/${data.type.id}`)
      router.refresh()
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus size={16} />
        New type
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New document type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Name</Label>
              <Input
                placeholder="e.g. Policy, Work Instruction…"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Prefix</Label>
              <Input
                placeholder="e.g. POL, WI, DOC…"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                className="h-9 text-sm font-mono"
                maxLength={10}
              />
              <p className="text-xs" style={{ color: 'var(--ink-4)' }}>Documents will be numbered POL-001, POL-002…</p>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button
                onClick={handleCreate}
                disabled={!name.trim() || !prefix.trim() || creating}
              >
                {creating && <Loader2 size={14} className="animate-spin mr-1" />}
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
