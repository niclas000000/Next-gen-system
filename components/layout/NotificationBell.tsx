'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Bell, CheckSquare, CheckCheck } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Notification {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  read: boolean
  createdAt: string
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  step_assigned: <CheckSquare size={14} style={{ color: 'var(--nw-accent)' }} />,
  step_due: <CheckSquare size={14} style={{ color: 'var(--warn)' }} />,
  instance_completed: <CheckCheck size={14} style={{ color: 'var(--ok)' }} />,
}

export function NotificationBell() {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(() => {
    fetch('/api/notifications')
      .then((r) => r.json())
      .then((d: { notifications: Notification[]; unreadCount: number }) => {
        setNotifications(d.notifications ?? [])
        setUnread(d.unreadCount ?? 0)
      })
      .catch(() => {})
  }, [])

  // Refresh on every route change
  useEffect(() => { fetchNotifications() }, [pathname, fetchNotifications])

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const markAllRead = async () => {
    await fetch('/api/notifications/read-all', { method: 'POST' })
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnread(0)
  }

  const handleClick = async (n: Notification) => {
    if (!n.read) {
      await fetch(`/api/notifications/${n.id}`, { method: 'PATCH' })
      setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x))
      setUnread((c) => Math.max(0, c - 1))
    }
    setOpen(false)
    if (n.link) router.push(n.link)
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center w-8 h-8 rounded transition-colors"
        style={{ color: 'var(--ink-4)' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--paper-3)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = '')}
        aria-label="Notifications"
      >
        <Bell size={16} />
        {unread > 0 && (
          <span
            className="absolute top-0.5 right-0.5 flex items-center justify-center text-[9px] font-bold leading-none rounded-full"
            style={{ background: 'var(--risk)', color: '#fff', minWidth: '14px', height: '14px', padding: '0 3px' }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-10 z-50 rounded-[2px] overflow-hidden"
          style={{
            width: '340px',
            background: 'var(--surface)',
            border: '1px solid var(--rule)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid var(--rule)' }}>
            <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Notifications</span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs transition-colors"
                style={{ color: 'var(--nw-accent)' }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto" style={{ maxHeight: '380px' }}>
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-sm" style={{ color: 'var(--ink-4)' }}>
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className="w-full text-left flex items-start gap-3 px-4 py-3 transition-colors"
                  style={{
                    borderBottom: '1px solid var(--rule)',
                    background: n.read ? 'transparent' : 'var(--accent-tint)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--paper-2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = n.read ? 'transparent' : 'var(--accent-tint)')}
                >
                  <div className="mt-0.5 shrink-0">
                    {TYPE_ICON[n.type] ?? <Bell size={14} style={{ color: 'var(--ink-4)' }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{n.title}</p>
                    {n.body && <p className="text-xs truncate" style={{ color: 'var(--ink-3)' }}>{n.body}</p>}
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--ink-4)' }}>
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  {!n.read && (
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: 'var(--nw-accent)' }} />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
