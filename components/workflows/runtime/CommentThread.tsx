'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'
import { Send, MessageSquare } from 'lucide-react'

interface Comment {
  id: string
  content: string
  createdAt: string
  author: { id: string; name: string; email: string }
}

interface Props {
  instanceId: string
  initialComments: Comment[]
}

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

export function CommentThread({ instanceId, initialComments }: Props) {
  const [comments, setComments] = useState(initialComments)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    setSubmitting(true)
    const res = await fetch(`/api/instances/${instanceId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text }),
    })
    setSubmitting(false)
    if (!res.ok) return
    const { comment } = await res.json() as { comment: Comment }
    setComments((prev) => [...prev, comment])
    setText('')
  }

  return (
    <div className="space-y-4">
      {comments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <MessageSquare size={20} className="mb-2" style={{ color: 'var(--ink-4)' }} />
          <p className="text-xs" style={{ color: 'var(--ink-4)' }}>No comments yet. Be the first.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                <AvatarFallback className="text-[10px]" style={{ background: 'var(--paper-3)', color: 'var(--ink-3)' }}>
                  {initials(c.author.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>{c.author.name}</span>
                  <span className="text-[10px]" style={{ color: 'var(--ink-4)' }}>
                    {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <div className="px-3 py-2 text-sm whitespace-pre-wrap break-words rounded-[2px]" style={{ background: 'var(--paper-2)', border: '1px solid var(--rule)', color: 'var(--ink-3)' }}>
                  {c.content}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 pt-2" style={{ borderTop: '1px solid var(--rule)' }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit(e as unknown as React.FormEvent)
          }}
          placeholder="Write a comment… (Ctrl+Enter to send)"
          rows={2}
          className="flex-1 text-sm px-3 py-2 resize-none focus:outline-none focus:ring-1 rounded-[2px]"
          style={{ border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)', '--tw-ring-color': 'var(--nw-accent)' } as React.CSSProperties}
        />
        <Button
          type="submit"
          size="icon"
          className="self-end h-9 w-9 shrink-0"
          disabled={submitting || !text.trim()}
        >
          <Send size={14} />
        </Button>
      </form>
    </div>
  )
}
