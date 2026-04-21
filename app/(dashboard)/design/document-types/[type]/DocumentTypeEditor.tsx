'use client'

import { useState, useEffect, useCallback } from 'react'
import { useFormBuilderStore } from '@/lib/stores/form-builder-store'
import { FieldPalette } from '@/components/workflows/designer/FormBuilder/FieldPalette'
import { FieldList } from '@/components/workflows/designer/FormBuilder/FieldList'
import { FieldProperties } from '@/components/workflows/designer/FormBuilder/FieldProperties'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import Link from 'next/link'
import type { FormField } from '@/types/field'

interface ApprovalFlowOption {
  id: string
  name: string
}

interface DocTypeData {
  id: string
  name: string
  prefix: string
  format: string
  propertyPackage: unknown
  approvalFlowId: string | null
  requireReadReceipt: boolean
  requireChangeDesc: boolean
  approvalFlow: ApprovalFlowOption | null
}

interface Props {
  docType: DocTypeData
  flows: ApprovalFlowOption[]
}

export function DocumentTypeEditor({ docType, flows }: Props) {
  const { loadForm, fields, isDirty } = useFormBuilderStore()
  const store = useFormBuilderStore()

  const [name, setName] = useState(docType.name)
  const [prefix, setPrefix] = useState(docType.prefix)
  const [format, setFormat] = useState(docType.format)
  const [approvalFlowId, setApprovalFlowId] = useState(docType.approvalFlowId ?? '')
  const [requireReadReceipt, setRequireReadReceipt] = useState(docType.requireReadReceipt)
  const [requireChangeDesc, setRequireChangeDesc] = useState(docType.requireChangeDesc)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'settings' | 'fields'>('settings')

  useEffect(() => {
    const pkg = Array.isArray(docType.propertyPackage)
      ? (docType.propertyPackage as FormField[])
      : []
    loadForm(`doctype-${docType.id}`, pkg)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docType.id])

  const settingsDirty =
    name !== docType.name ||
    prefix !== docType.prefix ||
    format !== docType.format ||
    (approvalFlowId || null) !== docType.approvalFlowId ||
    requireReadReceipt !== docType.requireReadReceipt ||
    requireChangeDesc !== docType.requireChangeDesc

  const hasChanges = isDirty || settingsDirty

  const save = useCallback(async () => {
    setSaving(true)
    try {
      await fetch(`/api/document-types/${docType.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          prefix,
          format,
          approvalFlowId: approvalFlowId || null,
          requireReadReceipt,
          requireChangeDesc,
          propertyPackage: store.fields,
        }),
      })
      useFormBuilderStore.setState({ isDirty: false })
    } finally {
      setSaving(false)
    }
  }, [name, prefix, format, approvalFlowId, requireReadReceipt, requireChangeDesc, store.fields, docType.id])

  const fieldCount = fields.filter((f) => !['section', 'heading', 'divider'].includes(f.type)).length

  return (
    <div className="flex flex-col h-full -m-6" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-3 shrink-0" style={{ borderBottom: '1px solid var(--rule)', background: 'var(--surface)' }}>
        <Link href="/design/document-types" className="transition-colors" style={{ color: 'var(--ink-4)' }}>
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold truncate" style={{ color: 'var(--ink)' }}>{docType.name}</h1>
            <Badge variant="default" className="text-xs font-mono shrink-0">{prefix}</Badge>
          </div>
          <p className="text-xs" style={{ color: 'var(--ink-4)' }}>Document type · {fieldCount} propert{fieldCount !== 1 ? 'ies' : 'y'}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex overflow-hidden text-xs rounded-[2px]" style={{ border: '1px solid var(--rule)' }}>
            {(['settings', 'fields'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-3 py-1.5 font-medium transition-colors"
                style={{
                  background: tab === t ? 'var(--ink)' : 'var(--surface)',
                  color: tab === t ? '#fff' : 'var(--ink-3)',
                }}
              >
                {t === 'settings' ? 'Settings' : 'Property Fields'}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={save}
            disabled={!hasChanges || saving}
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Settings tab */}
      {tab === 'settings' && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-xl space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Prefix</Label>
                <Input
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                  className="h-9 text-sm font-mono"
                  placeholder="DOC"
                  maxLength={10}
                />
                <p className="text-xs" style={{ color: 'var(--ink-4)' }}>
                  e.g. {prefix || 'DOC'}-001, {prefix || 'DOC'}-002…
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Content format</Label>
              <div className="flex gap-2">
                {[
                  { value: 'richtext', label: 'Rich text editor' },
                  { value: 'file', label: 'File upload' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setFormat(opt.value)}
                    className="flex-1 py-2.5 px-4 rounded-[2px] text-sm font-medium transition-colors"
                    style={{
                      border: `1px solid ${format === opt.value ? 'var(--nw-accent)' : 'var(--rule)'}`,
                      background: format === opt.value ? 'var(--accent-tint)' : 'var(--surface)',
                      color: format === opt.value ? 'var(--nw-accent)' : 'var(--ink-3)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Approval flow</Label>
              <select
                value={approvalFlowId}
                onChange={(e) => setApprovalFlowId(e.target.value)}
                className="w-full h-9 px-3 text-sm rounded-[2px] focus:outline-none focus:ring-2"
              style={{ border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)' }}
              >
                <option value="">No approval flow</option>
                {flows.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              {flows.length === 0 && (
                <p className="text-xs text-slate-400">
                  No flows yet.{' '}
                  <Link href="/design/approval-flows" className="hover:underline" style={{ color: 'var(--nw-accent)' }}>
                    Create one
                  </Link>
                  .
                </p>
              )}
            </div>

            <div className="space-y-3 pt-2" style={{ borderTop: '1px solid var(--rule)' }}>
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--ink-3)' }}>Require change description</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ink-4)' }}>
                    Authors must describe what changed when saving a new version.
                  </p>
                </div>
                <Switch checked={requireChangeDesc} onCheckedChange={setRequireChangeDesc} />
              </div>
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--ink-3)' }}>Require read receipt</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ink-4)' }}>
                    Users must acknowledge they have read published documents of this type.
                  </p>
                </div>
                <Switch checked={requireReadReceipt} onCheckedChange={setRequireReadReceipt} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fields tab */}
      {tab === 'fields' && (
        <div className="flex flex-1 overflow-hidden">
          <div className="w-52 overflow-y-auto shrink-0" style={{ borderRight: '1px solid var(--rule)', background: 'var(--paper-2)' }}>
            <FieldPalette />
          </div>
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 shrink-0" style={{ borderBottom: '1px solid var(--rule)', background: 'var(--surface)' }}>
              <p className="text-sm font-semibold flex-1" style={{ color: 'var(--ink)' }}>Property Fields</p>
              <span className="text-xs" style={{ color: 'var(--ink-4)' }}>
                {fieldCount} field{fieldCount !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <FieldList />
            </div>
          </div>
          <div className="w-64 overflow-y-auto shrink-0" style={{ borderLeft: '1px solid var(--rule)', background: 'var(--surface)' }}>
            <FieldProperties />
          </div>
        </div>
      )}
    </div>
  )
}
