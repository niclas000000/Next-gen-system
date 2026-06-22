'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ExpressionEditor } from './ExpressionEditor'
import type { AutomationConfig } from '@/types/workflow'

const CONFIG_TYPES: { value: AutomationConfig['type']; label: string }[] = [
  { value: 'set_variable', label: 'Set variable' },
  { value: 'send_notification', label: 'Send notification' },
  { value: 'send_email', label: 'Send email' },
]

function defaultConfig(type: AutomationConfig['type']): AutomationConfig {
  switch (type) {
    case 'set_variable': return { type, variableName: '', expression: '' }
    case 'send_notification': return { type, recipientType: 'initiator', recipientValue: '', title: '', body: '' }
    case 'send_email': return { type, to: '', subject: '', body: '' }
  }
}

interface Props {
  config: AutomationConfig
  onChange: (config: AutomationConfig) => void
  showTypeSelector?: boolean
}

export function ActionConfigForm({ config, onChange, showTypeSelector = true }: Props) {
  const selectStyle = {
    border: '1px solid var(--rule)',
    background: 'var(--surface)',
    color: 'var(--ink)',
  }

  return (
    <div className="space-y-3">
      {showTypeSelector && (
        <div className="space-y-1">
          <Label className="text-xs" style={{ color: 'var(--ink-3)' }}>Action type</Label>
          <select
            value={config.type}
            onChange={(e) => onChange(defaultConfig(e.target.value as AutomationConfig['type']))}
            className="w-full rounded-[2px] text-sm px-3 h-8 focus:outline-none"
            style={selectStyle}
          >
            {CONFIG_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      )}

      {config.type === 'set_variable' && (
        <>
          <div className="space-y-1">
            <Label className="text-xs" style={{ color: 'var(--ink-3)' }}>Variable name</Label>
            <Input
              value={config.variableName}
              onChange={(e) => onChange({ ...config, variableName: e.target.value })}
              className="h-8 text-sm font-mono"
              placeholder="total"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs" style={{ color: 'var(--ink-3)' }}>Expression</Label>
            <ExpressionEditor
              value={config.expression}
              onChange={(v) => onChange({ ...config, expression: v })}
              placeholder="variables.qty * variables.price"
            />
          </div>
        </>
      )}

      {config.type === 'send_notification' && (
        <>
          <div className="space-y-1">
            <Label className="text-xs" style={{ color: 'var(--ink-3)' }}>Recipient</Label>
            <select
              value={config.recipientType}
              onChange={(e) => onChange({ ...config, recipientType: e.target.value as 'user' | 'role' | 'initiator', recipientValue: '' })}
              className="w-full rounded-[2px] text-sm px-3 h-8 focus:outline-none"
              style={selectStyle}
            >
              <option value="initiator">Initiator (case creator)</option>
              <option value="role">Role</option>
              <option value="user">Specific user</option>
            </select>
          </div>
          {(config.recipientType === 'user' || config.recipientType === 'role') && (
            <div className="space-y-1">
              <Label className="text-xs" style={{ color: 'var(--ink-3)' }}>
                {config.recipientType === 'role' ? 'Role name' : 'User ID'}
              </Label>
              <Input
                value={config.recipientValue}
                onChange={(e) => onChange({ ...config, recipientValue: e.target.value })}
                className="h-8 text-sm"
                placeholder={config.recipientType === 'role' ? 'admin' : 'user-id'}
              />
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs" style={{ color: 'var(--ink-3)' }}>Title</Label>
            <Input
              value={config.title}
              onChange={(e) => onChange({ ...config, title: e.target.value })}
              className="h-8 text-sm"
              placeholder="Your request has been approved"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs" style={{ color: 'var(--ink-3)' }}>Message (optional)</Label>
            <textarea
              value={config.body}
              onChange={(e) => onChange({ ...config, body: e.target.value })}
              className="w-full rounded-[2px] text-sm px-3 py-2 h-16 resize-none focus:outline-none"
              style={{ border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)' }}
              placeholder="Additional context..."
            />
          </div>
        </>
      )}

      {config.type === 'send_email' && (
        <>
          <div className="space-y-1">
            <Label className="text-xs" style={{ color: 'var(--ink-3)' }}>To</Label>
            <Input
              value={config.to}
              onChange={(e) => onChange({ ...config, to: e.target.value })}
              className="h-8 text-sm"
              placeholder="user@example.com"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs" style={{ color: 'var(--ink-3)' }}>Subject</Label>
            <Input
              value={config.subject}
              onChange={(e) => onChange({ ...config, subject: e.target.value })}
              className="h-8 text-sm"
              placeholder="Your request status"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs" style={{ color: 'var(--ink-3)' }}>Body</Label>
            <textarea
              value={config.body}
              onChange={(e) => onChange({ ...config, body: e.target.value })}
              className="w-full rounded-[2px] text-sm px-3 py-2 h-24 resize-none focus:outline-none"
              style={{ border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--ink)' }}
              placeholder="Email body..."
            />
          </div>
          <p className="text-[10px] px-2 py-1 rounded-[2px]" style={{ background: 'var(--paper-2)', color: 'var(--ink-4)' }}>
            Email sending requires SMTP configuration — currently logs to console.
          </p>
        </>
      )}
    </div>
  )
}
