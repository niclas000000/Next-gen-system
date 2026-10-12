'use client'

import { useEffect, useState } from 'react'
import { PenLine } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props {
  open: boolean
  action: string
  caseNumber: string
  defaultMeaning: string
  busy: boolean
  onCancel: () => void
  onSign: (signature: { password: string; meaning: string }) => void
}

/** Electronic signature: the user confirms the meaning and re-enters the password (21 CFR Part 11 / Annex 11 style). */
export function SignDialog({ open, action, caseNumber, defaultMeaning, busy, onCancel, onSign }: Props) {
  const [meaning, setMeaning] = useState(defaultMeaning)
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (open) {
      setMeaning(defaultMeaning)
      setPassword('')
    }
  }, [open, defaultMeaning])

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="bg-surface border-rule rounded-[2px] sm:rounded-[2px] max-w-md">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (password && meaning.trim()) onSign({ password, meaning: meaning.trim() })
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-ink">
              <PenLine size={16} className="text-nw-accent" /> Electronic signature
            </DialogTitle>
            <DialogDescription className="text-ink-3">
              {action} for {caseNumber} requires your signature. It is recorded with your name, the time and the meaning below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label htmlFor="sig-meaning" className="text-[13px] font-medium text-ink-2">Meaning of the signature</label>
            <Input id="sig-meaning" value={meaning} onChange={(e) => setMeaning(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="sig-password" className="text-[13px] font-medium text-ink-2">Your password</label>
            <Input id="sig-password" type="password" autoComplete="current-password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="submit" disabled={busy || !password || !meaning.trim()}>Sign and {action.toLowerCase()}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
