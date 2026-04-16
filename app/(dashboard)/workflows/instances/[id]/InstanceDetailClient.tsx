'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StepTimeline } from '@/components/workflows/runtime/StepTimeline'
import { FormRenderer } from '@/components/workflows/runtime/FormRenderer'
import type { FormDefinition } from '@/types/field'
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  GitBranch,
  ChevronLeft,
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
}

interface Props {
  instance: InstanceInfo
  steps: StepInfo[]
  activeStep: { id: string; stepName: string; stepType: string } | null
  activeForm: FormDefinition | null
  decisionOptions: Array<{ id: string; label: string }>
}

const statusConfig: Record<string, { label: string; class: string; icon: React.ReactNode }> = {
  running: { label: 'Running', class: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Clock size={12} /> },
  completed: { label: 'Completed', class: 'bg-green-100 text-green-700 border-green-200', icon: <CheckCircle2 size={12} /> },
  cancelled: { label: 'Cancelled', class: 'bg-slate-100 text-slate-600 border-slate-200', icon: <XCircle size={12} /> },
  error: { label: 'Error', class: 'bg-red-100 text-red-700 border-red-200', icon: <AlertCircle size={12} /> },
}

export function InstanceDetailClient({ instance, steps, activeStep, activeForm, decisionOptions }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [submitting, setSubmitting] = useState(false)

  const cfg = statusConfig[instance.status] ?? statusConfig.running

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
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 mb-2 transition-colors"
          >
            <ChevronLeft size={14} />
            All Cases
          </button>
          <h1 className="text-2xl font-semibold text-slate-900">{instance.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <GitBranch size={12} />
              {instance.workflowName}
            </span>
            <Badge variant="outline" className={`text-xs flex items-center gap-1 ${cfg.class}`}>
              {cfg.icon}
              {cfg.label}
            </Badge>
          </div>
        </div>
        {instance.status === 'running' && (
          <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={handleCancel}>
            Cancel case
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Active step panel */}
        <div className="lg:col-span-3 space-y-4">
          {instance.status === 'completed' && (
            <Card className="shadow-sm border-green-200 bg-green-50">
              <CardContent className="p-5 flex items-center gap-3">
                <CheckCircle2 size={20} className="text-green-600 shrink-0" />
                <div>
                  <p className="font-medium text-green-800">Case completed</p>
                  {instance.completedAt && (
                    <p className="text-xs text-green-600">
                      {new Date(instance.completedAt).toLocaleString('en-GB')}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {instance.status === 'cancelled' && (
            <Card className="shadow-sm border-slate-200 bg-slate-50">
              <CardContent className="p-5 flex items-center gap-3">
                <XCircle size={20} className="text-slate-500 shrink-0" />
                <p className="font-medium text-slate-600">Case cancelled</p>
              </CardContent>
            </Card>
          )}

          {activeStep && instance.status === 'running' && (
            <Card className="shadow-sm border-blue-200">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <CardTitle className="text-base font-semibold text-slate-800">
                    {activeStep.stepName}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                {/* Decision node */}
                {activeStep.stepType === 'decision' && (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600">Choose a path to continue:</p>
                    <div className="flex flex-wrap gap-2">
                      {decisionOptions.map((opt) => (
                        <Button
                          key={opt.id}
                          variant="outline"
                          disabled={submitting || isPending}
                          onClick={() => handleDecision(opt.id)}
                          className="border-orange-200 text-orange-700 hover:bg-orange-50"
                        >
                          {opt.label}
                        </Button>
                      ))}
                      {decisionOptions.length === 0 && (
                        <Button
                          disabled={submitting || isPending}
                          onClick={() => handleDecision('')}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
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
                    <p className="text-sm text-slate-500">No form configured for this step.</p>
                    <Button
                      disabled={submitting || isPending}
                      onClick={handleTaskNoForm}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
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
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-600">Case Data</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-1">
                  {Object.entries(instance.variables).map(([key, val]) => (
                    <div key={key} className="flex gap-3 text-sm">
                      <span className="font-medium text-slate-500 min-w-[120px]">{key}</span>
                      <span className="text-slate-700">{String(val)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Timeline */}
        <div className="lg:col-span-2">
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-semibold text-slate-600">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <StepTimeline steps={steps} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
