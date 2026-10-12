'use client'

import { createContext, useCallback, useContext, useState } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastKind = 'ok' | 'error' | 'info'
interface Toast {
  id: number
  kind: ToastKind
  message: string
  action?: { label: string; onClick: () => void }
}

interface ToastApi {
  show: (message: string, opts?: { kind?: ToastKind; action?: Toast['action'] }) => void
  ok: (message: string) => void
  error: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const ICONS: Record<ToastKind, React.ReactNode> = {
  ok: <CheckCircle2 size={15} className="text-ok shrink-0" />,
  error: <AlertCircle size={15} className="text-risk shrink-0" />,
  info: <Info size={15} className="text-nw-accent shrink-0" />,
}

let nextId = 1

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const show = useCallback<ToastApi['show']>(
    (message, opts) => {
      const id = nextId++
      setToasts((t) => [...t.slice(-3), { id, message, kind: opts?.kind ?? 'info', action: opts?.action }])
      setTimeout(() => dismiss(id), opts?.kind === 'error' ? 7000 : 4000)
    },
    [dismiss]
  )

  const api: ToastApi = {
    show,
    ok: (m) => show(m, { kind: 'ok' }),
    error: (m) => show(m, { kind: 'error' }),
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[min(380px,calc(100vw-2rem))]" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'flex items-start gap-2.5 rounded-[2px] border bg-surface px-3.5 py-3 text-sm text-ink shadow-[0_8px_24px_-12px_rgba(0,0,0,0.25)]',
              t.kind === 'error' ? 'border-risk-line' : 'border-rule'
            )}
          >
            {ICONS[t.kind]}
            <span className="flex-1 leading-snug">{t.message}</span>
            {t.action && (
              <button
                className="text-xs font-medium text-nw-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nw-accent"
                onClick={() => {
                  t.action!.onClick()
                  dismiss(t.id)
                }}
              >
                {t.action.label}
              </button>
            )}
            <button
              aria-label="Dismiss"
              className="text-ink-4 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nw-accent rounded-[2px]"
              onClick={() => dismiss(t.id)}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
