'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './dialog'
import { Button } from './button'

interface Request {
  message: string
  confirmLabel: string
  danger: boolean
  resolve: (ok: boolean) => void
}

let show: ((r: Request) => void) | null = null

/**
 * Promise-based replacement for window.confirm, rendered by <ConfirmHost /> in the app providers.
 * Destructive wording ("Delete …", "Reject …") gets a danger button labelled with that verb.
 */
export function confirmDialog(message: string, opts?: { confirmLabel?: string; danger?: boolean }): Promise<boolean> {
  const verb = message.match(/^(Delete|Remove|Reject|Cancel|Archive)\b/)?.[1]
  return new Promise((resolve) => {
    if (!show) return resolve(window.confirm(message))
    show({
      message,
      confirmLabel: opts?.confirmLabel ?? verb ?? 'Confirm',
      danger: opts?.danger ?? !!verb,
      resolve,
    })
  })
}

export function ConfirmHost() {
  const [req, setReq] = useState<Request | null>(null)

  useEffect(() => {
    show = setReq
    return () => {
      show = null
    }
  }, [])

  const close = (ok: boolean) => {
    req?.resolve(ok)
    setReq(null)
  }

  const [first, ...rest] = (req?.message ?? '').split('\n').filter(Boolean)
  return (
    <Dialog open={!!req} onOpenChange={(o) => !o && close(false)}>
      <DialogContent className="max-w-md rounded-[2px] border-rule bg-surface sm:rounded-[2px]">
        <DialogHeader>
          <DialogTitle className="flex items-start gap-2.5 text-base font-semibold leading-snug text-ink">
            {req?.danger && <AlertTriangle size={17} className="mt-0.5 shrink-0 text-risk" />}
            {first}
          </DialogTitle>
          {rest.length > 0 && <DialogDescription className="text-ink-3">{rest.join(' ')}</DialogDescription>}
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => close(false)}>Keep</Button>
          <Button variant={req?.danger ? 'destructive' : 'default'} onClick={() => close(true)} autoFocus>
            {req?.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
