'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

interface CaseTypeOption {
  id: string
  name: string
  prefix: string
  status: string
}

/** "+ New case": pick a published case type, give a title, land on the new case. */
export function NewCaseDialog({
  open,
  onOpenChange,
  defaultCaseTypeId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultCaseTypeId?: string
}) {
  const router = useRouter()
  const toast = useToast()
  const [types, setTypes] = useState<CaseTypeOption[]>([])
  const [typeId, setTypeId] = useState(defaultCaseTypeId ?? '')
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle('')
    fetch('/api/case-types')
      .then((r) => r.json())
      .then((d: { caseTypes: CaseTypeOption[] }) => {
        const published = d.caseTypes.filter((t) => t.status === 'published')
        setTypes(published)
        setTypeId((cur) => cur || defaultCaseTypeId || published[0]?.id || '')
      })
      .catch(() => toast.error('Could not load case types'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function create() {
    setBusy(true)
    const res = await fetch('/api/cases', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ caseTypeId: typeId, title }),
    })
    const json = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) return toast.error(json.error ?? 'The case could not be created')
    onOpenChange(false)
    toast.ok(`${json.case.number} created`)
    router.push(`/cases/${json.case.number}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-rule rounded-[2px] sm:rounded-[2px] max-w-md">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (typeId) create()
          }}
        >
          <DialogHeader>
            <DialogTitle className="font-display text-ink">New case</DialogTitle>
            <DialogDescription className="text-ink-3">The case starts in the first phase with you as the one registering it.</DialogDescription>
          </DialogHeader>
          <fieldset className="space-y-1.5">
            <legend className="text-[13px] font-medium text-ink-2 mb-1.5">Case type</legend>
            <div className="grid gap-1.5">
              {types.map((t) => (
                <label
                  key={t.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-[2px] border px-3 py-2 text-sm',
                    typeId === t.id ? 'border-nw-accent bg-accent-tint' : 'border-rule hover:bg-paper-2'
                  )}
                >
                  <input type="radio" name="caseType" className="sr-only" checked={typeId === t.id} onChange={() => setTypeId(t.id)} />
                  <span className="font-mono text-xs text-nw-accent w-10">{t.prefix}</span>
                  <span className="text-ink">{t.name}</span>
                </label>
              ))}
              {!types.length && <p className="text-sm text-ink-4">No published case types yet — publish one under Design → Case types.</p>}
            </div>
          </fieldset>
          <div className="space-y-1.5">
            <label htmlFor="new-title" className="text-[13px] font-medium text-ink-2">Title</label>
            <Input id="new-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short description of what happened" />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy || !typeId}>Create case</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function NewCaseButton({ caseTypeId }: { caseTypeId?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus size={14} /> New case
      </Button>
      <NewCaseDialog open={open} onOpenChange={setOpen} defaultCaseTypeId={caseTypeId} />
    </>
  )
}
