'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import type { Phase } from '@/lib/case-config/schema'
import { useEditor } from './EditorContext'
import { AddButton, Chip, Field, Panel, RowActions, TextArea, TextInput, makeId, move } from './controls'

export function PhasesTab() {
  const { config, update, focusId } = useEditor()
  const refs = useRef<Record<string, HTMLLIElement | null>>({})

  useEffect(() => {
    if (focusId) refs.current[focusId]?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [focusId])

  function addPhase() {
    update((d) => {
      const prev = d.phases[d.phases.length - 1]
      const id = makeId('New phase', d.phases.map((p) => p.id))
      // What was shown before is shown read-only in the new phase
      const fields: Phase['fields'] = {}
      for (const [fid, pl] of Object.entries(prev?.fields ?? {}))
        if (pl.access !== 'hidden') fields[fid] = { access: 'readOnly', mandatory: null, title: pl.title }
      d.phases.push({
        id,
        name: 'New phase',
        description: '',
        responsibleRoleIds: [],
        permissions: {},
        fields,
        layout: [],
        rules: [],
        deadlineDays: null,
        deadlineHours: null,
      })
    })
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <p className="text-sm text-ink-3">
        A case moves through the phases in order. Sending back goes to the previous phase; quick close ends the case early where
        a role is allowed to.
      </p>
      <ol className="space-y-3">
        {config.phases.map((p, i) => (
          <li key={p.id} ref={(el) => void (refs.current[p.id] = el)}>
            <Panel className={cn(focusId === p.id && 'ring-2 ring-nw-accent')}>
              <div className="flex items-start gap-4">
                <span className="mt-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-tint font-mono text-xs text-nw-accent">
                  {i + 1}
                </span>
                <div className="grid flex-1 gap-3">
                  <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
                    <Field label="Phase name">
                      <TextInput value={p.name} onChange={(e) => update((d) => void (d.phases[i].name = e.target.value))} />
                    </Field>
                    <Field label="Lead time (days)">
                      <TextInput
                        type="number"
                        min={1}
                        value={p.deadlineDays ?? ''}
                        placeholder="—"
                        onChange={(e) => update((d) => void (d.phases[i].deadlineDays = e.target.value ? Math.max(1, Number(e.target.value)) : null))}
                      />
                    </Field>
                  </div>
                  <Field label="What happens in the phase">
                    <TextArea value={p.description} rows={2} onChange={(e) => update((d) => void (d.phases[i].description = e.target.value))} />
                  </Field>
                  <div>
                    <p className="mb-1.5 text-[13px] font-medium text-ink-2">Responsible</p>
                    <div className="flex flex-wrap gap-1.5">
                      {config.roles.map((r) => (
                        <Chip
                          key={r.id}
                          on={p.responsibleRoleIds.includes(r.id)}
                          onClick={() =>
                            update((d) => {
                              const list = d.phases[i].responsibleRoleIds
                              d.phases[i].responsibleRoleIds = list.includes(r.id) ? list.filter((x) => x !== r.id) : [...list, r.id]
                            })
                          }
                        >
                          {r.name}
                        </Chip>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-ink-3">
                    <span>When the case arrives, notify</span>
                    <Chip on={p.notify?.mode !== 'roles'} onClick={() => update((d) => void delete d.phases[i].notify)}>
                      everyone with permission
                    </Chip>
                    {config.roles.map((r) => (
                      <Chip
                        key={r.id}
                        on={p.notify?.mode === 'roles' && p.notify.roleIds.includes(r.id)}
                        onClick={() =>
                          update((d) => {
                            const cur = d.phases[i].notify?.mode === 'roles' ? d.phases[i].notify!.roleIds : []
                            const roleIds = cur.includes(r.id) ? cur.filter((x) => x !== r.id) : [...cur, r.id]
                            d.phases[i].notify = roleIds.length ? { mode: 'roles', roleIds } : undefined
                          })
                        }
                      >
                        {r.name}
                      </Chip>
                    ))}
                  </div>
                </div>
                <RowActions
                  index={i}
                  count={config.phases.length}
                  label={p.name}
                  onMove={(to) => update((d) => move(d.phases, i, to))}
                  onDelete={() => update((d) => void d.phases.splice(i, 1))}
                />
              </div>
            </Panel>
          </li>
        ))}
      </ol>
      <AddButton onClick={addPhase}>Add phase</AddButton>
    </div>
  )
}
