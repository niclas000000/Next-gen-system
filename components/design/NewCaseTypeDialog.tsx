'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileUp, Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

/** New case type: blank, or import a configuration exported from CANEA Blueprint (JSON). */
export function NewCaseTypeButton() {
  const router = useRouter()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'blank' | 'import'>('blank')
  const [name, setName] = useState('')
  const [json, setJson] = useState('')
  const [busy, setBusy] = useState(false)
  const file = useRef<HTMLInputElement>(null)

  async function create() {
    let body: unknown
    if (mode === 'blank') body = { name }
    else {
      try {
        const parsed = JSON.parse(json)
        // Blueprint's JSON export may wrap the configuration
        body = { config: parsed.configuration ?? parsed.config ?? parsed }
      } catch {
        return toast.error('That is not valid JSON')
      }
    }
    setBusy(true)
    const res = await fetch('/api/case-types', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const out = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) {
      const first = out.issues?.[0]
      return toast.error(first ? `${out.error}: ${first.path?.join('.')} — ${first.message}` : out.error ?? 'Could not create the case type')
    }
    setOpen(false)
    toast.ok(mode === 'import' ? 'Configuration imported as a draft' : 'Case type created')
    router.push(`/design/case-types/${out.caseType.id}`)
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus size={14} /> New case type
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg rounded-[2px] border-rule bg-surface sm:rounded-[2px]">
          <DialogHeader>
            <DialogTitle className="font-display text-ink">New case type</DialogTitle>
            <DialogDescription className="text-ink-3">Start from scratch or import a configuration from CANEA Blueprint.</DialogDescription>
          </DialogHeader>
          <div className="flex rounded-[2px] border border-rule p-0.5" role="tablist">
            {(['blank', 'import'] as const).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={cn('flex-1 rounded-[2px] py-1.5 text-sm', mode === m ? 'bg-ink text-paper' : 'text-ink-3 hover:bg-paper-2')}
              >
                {m === 'blank' ? 'Blank' : 'Import JSON'}
              </button>
            ))}
          </div>
          {mode === 'blank' ? (
            <label className="block space-y-1.5">
              <span className="text-[13px] font-medium text-ink-2">Name</span>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Customer complaint" />
            </label>
          ) : (
            <div className="space-y-2">
              <textarea
                value={json}
                onChange={(e) => setJson(e.target.value)}
                rows={8}
                placeholder="Paste the JSON export from Blueprint"
                className="w-full rounded-[2px] border border-rule bg-surface p-3 font-mono text-xs text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nw-accent"
              />
              <input
                ref={file}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0]
                  if (f) setJson(await f.text())
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => file.current?.click()}>
                <FileUp size={13} /> Choose file…
              </Button>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create} disabled={busy || (mode === 'blank' ? !name.trim() : !json.trim())}>
              {mode === 'blank' ? 'Create' : 'Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
