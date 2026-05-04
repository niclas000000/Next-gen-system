'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StepTimeline } from '@/components/workflows/runtime/StepTimeline'
import { FormRenderer } from '@/components/workflows/runtime/FormRenderer'
import { CommentThread } from '@/components/workflows/runtime/CommentThread'
import { AuditLog } from '@/components/workflows/runtime/AuditLog'
import type { FormDefinition } from '@/types/field'
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  GitBranch,
  ChevronLeft,
  User,
} from 'lucide-react'

interface InstanceInfo {
  id: string
  title: string
  status: string
  workflowName: string
  variables: Record<string, unknown>
  createdAt: string
  completedAt: string | null
}

interface StepInfo {
  id: string
  nodeId: string
  stepName: string
  stepType: string
  status: string
  startedAt: string | null
  completedAt: string | null
  formData: Record<string, unknown> | null
  decision: string | null
  assigneeName: string | null
  assignedRole: string | null
  dueAt: string | null
}

interface Comment {
  id: string
  content: string
  createdAt: string
  author: { id: string; name: string; email: string }
}

interface AuditEntry {
  id: string
  action: string
  actor: string
  actorName: string
  timestamp: string
  details: Record<string, unknown>
}

interface Props {
  instance: InstanceInfo
  steps: StepInfo[]
  activeStep: { id: string; stepName: string; stepType: string; assigneeName: string | null; assignedRole: string | null } | null
  activeForm: FormDefinition | null
  decisionOptions: Array<{ id: string; label: string }>
  comments: Comment[]
  auditEntries: AuditEntry[]
}

const statusVariant: Record<string, 'warn' | 'ok' | 'default' | 'risk'> = {
  running: 'warn', completed: 'ok', cancelled: 'default', error: 'risk',
}
const statusLabel: Record<string, string> = {
  running: 'Running', completed: 'Completed', cancelled: 'Cancelled', error: 'Error',
}
const statusIcon: Record<string, React.ReactNode> = {
  running: <Clock size={12} />, completed: <CheckCircle2 size={12} />, cancelled: <XCircle size={12} />, error: <AlertCircle size={12} />,
}

export function InstanceDetailClient({ instance, steps, activeStep, activeForm, decisionOptions, comments, auditEntries }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [submitting, setSubmitting] = useState(false)
  const [rightTab, setRightTab] = useState<'timeline' | 'comments' | 'audit'>('timeline')

  const handleFormSubmit = async (formData: Record<string, unknown>) => {
    setSubmitting(true)
    try {
      await fetch(`/api/instances/${instance.id}/steps/${activeStep!.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData }),
      })
      startTransition(() => router.refresh())
    } finally {
      setSubmitting(false)
    }
  }

  const handleDecision = async (decisionId: string) => {
    setSubmitting(true)
    try {
      await fetch(`/api/instances/${instance.id}/steps/${activeStep!.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: decisionId }),
      })
      startTransition(() => router.refresh())
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm('Cancel this case?')) return
    await fetch(`/api/instances/${instance.id}/cancel`, { method: 'POST' })
    startTransition(() => router.refresh())
  }

  const handleTaskNoForm = async () => {
    setSubmitting(true)
    try {
      await fetch(`/api/instances/${instance.id}/steps/${activeStep!.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData: {} }),
      })
      startTransition(() => router.refresh())
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => router.push('/workflows/instances')}
            className="flex items-center gap-1 text-xs mb-2 transition-colors"
            style={{ color: 'var(--ink-4)' }}
          >
            <ChevronLeft size={14} />
            All Cases
          </button>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink)' }}>{instance.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--ink-4)' }}>
              <GitBranch size={12} />
              {instance.workflowName}
            </span>
            <Badge variant={statusVariant[instance.status] ?? 'default'} className="text-xs flex items-center gap-1">
              {statusIcon[instance.status]}
              {statusLabel[instance.status] ?? instance.status}
            </Badge>
          </div>
        </div>
        {instance.status === 'running' && (
          <Button variant="outline" size="sm" className="gap-1" style={{ color: 'var(--risk)', borderColor: 'var(--risk)' }} onClick={handleCancel}>
            Cancel case
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Active step panel */}
        <div className="lg:col-span-3 space-y-4">
          {instance.status === 'completed' && (
            <Card style={{ borderColor: 'var(--ok)', background: 'oklch(0.97 0.04 145)' }}>
              <CardContent className="p-5 flex items-center gap-3">
                <CheckCircle2 size={20} className="shrink-0" style={{ color: 'var(--ok)' }} />
                <div>
                  <p className="font-medium" style={{ color: 'var(--ok)' }}>Case completed</p>
                  {instance.completedAt && (
                    <p className="text-xs" style={{ color: 'var(--ok)' }}>
                      {new Date(instance.completedAt).toLocaleString('en-GB')}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {instance.status === 'cancelled' && (
            <Card style={{ borderColor: 'var(--rule)', background: 'var(--paper-2)' }}>
              <CardContent className="p-5 flex items-center gap-3">
                <XCircle size={20} className="shrink-0" style={{ color: 'var(--ink-4)' }} />
                <p className="font-medium" style={{ color: 'var(--ink-3)' }}>Case cancelled</p>
              </CardContent>
            </Card>
          )}

          {activeStep && instance.status === 'running' && (
            <Card style={{ borderColor: 'var(--nw-accent)' }}>
              <CardHeader className="pb-3" style={{ borderBottom: '1px solid var(--rule)' }}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--nw-accent)' }} />
                    <CardTitle className="text-base font-semibold" style={{ color: 'var(--ink)' }}>
                      {activeStep.stepName}
                    </CardTitle>
                  </div>
                  {(activeStep.assigneeName || activeStep.assignedRole) && (
                    <div className="flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1 shrink-0"
                      style={{ background: 'var(--paper-2)', color: 'var(--ink-3)', border: '1px solid var(--rule)' }}>
                      <User size={11} />
                      {activeStep.assigneeName ?? activeStep.assignedRole}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-5">
                {/* Decision node */}
                {activeStep.stepType === 'decision' && (
                  <div className="space-y-3">
                    <p className="text-sm" style={{ color: 'var(--ink-3)' }}>Choose a path to continue:</p>
                    <div className="flex flex-wrap gap-2">
                      {decisionOptions.map((opt) => (
                        <Button
                          key={opt.id}
                          variant="outline"
                          disabled={submitting || isPending}
                          onClick={() => handleDecision(opt.id)}
                          style={{ color: 'var(--warn)', borderColor: 'var(--warn)' }}
                        >
                          {opt.label}
                        </Button>
                      ))}
                      {decisionOptions.length === 0 && (
                        <Button
                          disabled={submitting || isPending}
                          onClick={() => handleDecision('')}
                        >
                          Continue
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Task node with form */}
                {activeStep.stepType === 'task' && activeForm && (
                  <FormRenderer
                    form={activeForm}
                    onSubmit={handleFormSubmit}
                    submitting={submitting || isPending}
                  />
                )}

                {/* Task node without form */}
                {activeStep.stepType === 'task' && !activeForm && (
                  <div className="space-y-3">
                    <p className="text-sm" style={{ color: 'var(--ink-4)' }}>No form configured for this step.</p>
                    <Button
                      disabled={submitting || isPending}
                      onClick={handleTaskNoForm}
                    >
                      {submitting || isPending ? 'Processing...' : 'Complete step'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Variables */}
          {Object.keys(instance.variables).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold" style={{ color: 'var(--ink-3)' }}>Case Data</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-1">
                  {Object.entries(instance.variables).map(([key, val]) => (
                    <div key={key} className="flex gap-3 text-sm">
                      <span className="font-medium min-w-[120px]" style={{ color: 'var(--ink-4)' }}>{key}</span>
                      <span style={{ color: 'var(--ink-3)' }}>{String(val)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right panel: Timeline / Comments / Audit */}
        <div className="lg:col-span-2">
          <Card>
            {/* Tab strip */}
            <div className="flex" style={{ borderBottom: '1px solid var(--rule)' }}>
              {([
                { id: 'timeline', label: 'Timeline', count: steps.length },
                { id: 'comments', label: 'Comments', count: comments.length },
                { id: 'audit',    label: 'Audit log', count: auditEntries.length },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setRightTab(tab.id)}
                  className="flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors"
                  style={{
                    borderColor: rightTab === tab.id ? 'var(--nw-accent)' : 'transparent',
                    color: rightTab === tab.id ? 'var(--nw-accent)' : 'var(--ink-4)',
                  }}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="rounded-full px-1.5 py-0.5 text-[10px] font-medium" style={{
                      background: rightTab === tab.id ? 'var(--accent-tint)' : 'var(--paper-3)',
                      color: rightTab === tab.id ? 'var(--nw-accent)' : 'var(--ink-4)',
                    }}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <CardContent className="p-5">
              {rightTab === 'timeline' && <StepTimeline steps={steps} />}
              {rightTab === 'comments' && (
                <CommentThread instanceId={instance.id} initialComments={comments} />
              )}
              {rightTab === 'audit' && <AuditLog entries={auditEntries} />}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
