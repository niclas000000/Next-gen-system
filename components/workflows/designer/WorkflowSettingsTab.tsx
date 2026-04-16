'use client'

import { useWorkflowDesignerStore } from '@/lib/stores/workflow-designer-store'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import type { WorkflowSettings } from '@/types/workflow'

function defaultSettings(s: Partial<WorkflowSettings>): WorkflowSettings {
  return {
    allowReassign: s.allowReassign ?? true,
    allowCancel: s.allowCancel ?? true,
    allowComments: s.allowComments ?? true,
    allowAttachments: s.allowAttachments ?? false,
    instanceTitleTemplate: s.instanceTitleTemplate ?? '',
    archiveAfterDays: s.archiveAfterDays,
    notifications: {
      onStart: s.notifications?.onStart ?? false,
      onComplete: s.notifications?.onComplete ?? true,
      onStep: s.notifications?.onStep ?? false,
    },
  }
}

export function WorkflowSettingsTab() {
  const { workflowSettings, updateWorkflowMeta } = useWorkflowDesignerStore()
  const settings = defaultSettings(workflowSettings ?? {})

  const update = (patch: Partial<WorkflowSettings>) => {
    updateWorkflowMeta({ settings: { ...settings, ...patch } })
  }

  const updateNotif = (key: keyof WorkflowSettings['notifications'], val: boolean) => {
    update({ notifications: { ...settings.notifications, [key]: val } })
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-lg space-y-8">
        <div>
          <h3 className="font-semibold text-slate-800 text-sm mb-4">General</h3>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Instance title template</Label>
              <Input
                value={settings.instanceTitleTemplate}
                onChange={(e) => update({ instanceTitleTemplate: e.target.value })}
                placeholder="e.g. Purchase Request — {variables.requester}"
                className="text-sm"
              />
              <p className="text-[11px] text-slate-400">Use {'{variables.fieldName}'} to include form data in the case title.</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Archive after (days)</Label>
              <Input
                type="number"
                min={0}
                value={settings.archiveAfterDays ?? ''}
                onChange={(e) => update({ archiveAfterDays: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                placeholder="Never"
                className="text-sm w-32"
              />
              <p className="text-[11px] text-slate-400">Completed cases are archived after this many days. Leave empty to never archive.</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-slate-800 text-sm mb-4">Permissions</h3>
          <div className="space-y-3">
            {([
              ['allowReassign', 'Allow reassignment', 'Case participants can reassign a step to another user.'],
              ['allowCancel', 'Allow cancel', 'Case participants can cancel a running case.'],
              ['allowComments', 'Allow comments', 'Participants can add comments to a case.'],
              ['allowAttachments', 'Allow attachments', 'Participants can attach files to a case.'],
            ] as [keyof WorkflowSettings, string, string][]).map(([key, label, desc]) => (
              <div key={key} className="flex items-start justify-between gap-4 py-2 border-b border-slate-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-700">{label}</p>
                  <p className="text-xs text-slate-400">{desc}</p>
                </div>
                <Switch
                  checked={settings[key] as boolean}
                  onCheckedChange={(val) => update({ [key]: val })}
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-slate-800 text-sm mb-4">Notifications</h3>
          <div className="space-y-3">
            {([
              ['onStart', 'On case start', 'Notify when a new case is started.'],
              ['onComplete', 'On case complete', 'Notify when a case is completed.'],
              ['onStep', 'On step assignment', 'Notify when a step is assigned to a user.'],
            ] as [keyof WorkflowSettings['notifications'], string, string][]).map(([key, label, desc]) => (
              <div key={key} className="flex items-start justify-between gap-4 py-2 border-b border-slate-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-700">{label}</p>
                  <p className="text-xs text-slate-400">{desc}</p>
                </div>
                <Switch
                  checked={settings.notifications[key]}
                  onCheckedChange={(val) => updateNotif(key, val)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
