'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Play } from 'lucide-react'

interface Props {
  workflowId: string
  workflowName: string
}

export function StartWorkflowButton({ workflowId, workflowName }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [, startTransition] = useTransition()

  const handleStart = async (e: React.MouseEvent) => {
    e.preventDefault() // don't navigate to designer
    setLoading(true)
    try {
      const res = await fetch('/api/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        alert(data.error ?? 'Could not start workflow')
        return
      }
      const data = await res.json() as { instance: { id: string } }
      startTransition(() => router.push(`/workflows/instances/${data.instance.id}`))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-1"
      style={{ color: 'var(--ok)', borderColor: 'var(--ok)' }}
      onClick={handleStart}
      disabled={loading}
      title={`Start a new case for ${workflowName}`}
    >
      <Play size={12} />
      {loading ? 'Starting...' : 'Start'}
    </Button>
  )
}
