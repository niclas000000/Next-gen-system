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
          <MessageSquare size={20} className="text-slate-300 mb-2" />
          <p className="text-xs text-slate-400">No comments yet. Be the first.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                <AvatarFallback className="bg-blue-100 text-blue-700 text-[10px]">
                  {initials(c.author.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-xs font-medium text-slate-700">{c.author.name}</span>
                  <span className="text-[10px] text-slate-400">
                    {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 whitespace-pre-wrap break-words">
                  {c.content}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 pt-2 border-t border-slate-100">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit(e as unknown as React.FormEvent)
          }}
          placeholder="Write a comment… (Ctrl+Enter to send)"
          rows={2}
          className="flex-1 text-sm rounded-md border border-slate-200 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
        />
        <Button
          type="submit"
          size="icon"
          className="bg-blue-600 hover:bg-blue-700 self-end h-9 w-9 shrink-0"
          disabled={submitting || !text.trim()}
        >
          <Send size={14} />
        </Button>
      </form>
    </div>
  )
}
