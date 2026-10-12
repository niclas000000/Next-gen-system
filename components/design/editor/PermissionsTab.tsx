'use client'

import { cn } from '@/lib/utils'
import type { PhasePermission } from '@/lib/case-config/schema'
import { useEditor } from './EditorContext'

const RIGHTS: { key: keyof PhasePermission; code: string; label: string }[] = [
  { key: 'edit', code: 'E', label: 'Edit' },
  { key: 'forward', code: 'F', label: 'Send forward' },
  { key: 'backward', code: 'B', label: 'Send back' },
  { key: 'preEnd', code: 'P', label: 'Quick close' },
]

export function PermissionsTab() {
  const { config, update } = useEditor()

  const toggle = (phaseIndex: number, roleId: string, key: keyof PhasePermission) =>
    update((d) => {
      const perms = d.phases[phaseIndex].permissions
      const cur = perms[roleId] ?? { edit: false, forward: false, backward: false, preEnd: false }
      const next = { ...cur, [key]: !cur[key] }
      if (Object.values(next).some(Boolean)) perms[roleId] = next
      else delete perms[roleId]
    })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-3">
        {RIGHTS.map((r) => (
          <span key={r.key} className="inline-flex items-center gap-1.5">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-[2px] bg-ink font-mono text-[10px] text-paper">{r.code}</span>
            {r.label}
          </span>
        ))}
        <span className="text-ink-4">The phase is with the roles that may send it forward. Group roles only edit the field that appoints the responsible person.</span>
      </div>

      <div className="overflow-x-auto rounded-[2px] border border-rule bg-surface">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 min-w-[220px] border-b border-r border-rule bg-surface px-4 py-2.5 text-left font-normal">
                <span className="mono-meta">Role</span>
              </th>
              {config.phases.map((p, i) => (
                <th key={p.id} className="min-w-[150px] border-b border-rule px-2 py-2.5 text-center font-normal">
                  <span className="block font-mono text-[10px] text-ink-4">{i + 1}</span>
                  <span className="block text-xs font-medium text-ink">{p.name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {config.roles.map((role) => (
              <tr key={role.id}>
                <th scope="row" className="sticky left-0 border-b border-r border-rule-soft bg-surface px-4 py-2 text-left font-normal">
                  <span className="block text-[13px] text-ink">{role.name}</span>
                  <span className="text-[11px] text-ink-4">{role.kind === 'group' ? 'Group inbox' : 'One person'}</span>
                </th>
                {config.phases.map((p, i) => {
                  const perm = p.permissions[role.id]
                  const responsible = p.responsibleRoleIds.includes(role.id)
                  return (
                    <td key={p.id} className={cn('border-b border-rule-soft px-2 py-2 text-center', responsible && 'bg-accent-tint')}>
                      <div className="inline-flex gap-1" role="group" aria-label={`${role.name} in ${p.name}`}>
                        {RIGHTS.map((r) => {
                          const on = !!perm?.[r.key]
                          return (
                            <button
                              key={r.key}
                              aria-pressed={on}
                              aria-label={r.label}
                              title={`${r.label} — ${role.name} in ${p.name}`}
                              onClick={() => toggle(i, role.id, r.key)}
                              className={cn(
                                'h-6 w-6 rounded-[2px] font-mono text-[10px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nw-accent',
                                on ? 'bg-ink text-paper' : 'border border-rule text-ink-4 hover:border-ink-4 hover:text-ink'
                              )}
                            >
                              {r.code}
                            </button>
                          )
                        })}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-4">Highlighted cells: the role is responsible for the phase (set under Phases).</p>
    </div>
  )
}
