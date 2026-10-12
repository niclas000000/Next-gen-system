'use client'

import { Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEditor } from './EditorContext'
import { AddButton, Chip, Field, Panel, RowActions, Select, TextArea, TextInput, makeId, move } from './controls'

export function BasicsTab() {
  const { config, update, bindings, setBindings, groups, users } = useEditor()

  const usedRole = (roleId: string) =>
    config.phases.some((p) => p.permissions[roleId] || p.responsibleRoleIds.includes(roleId)) ||
    config.fields.some((f) => f.assignsRoleId === roleId)

  const binding = (roleId: string) => bindings[roleId] ?? { userIds: [], groupIds: [] }
  const toggleBinding = (roleId: string, kind: 'groupIds' | 'userIds', id: string) => {
    const b = binding(roleId)
    const list = b[kind].includes(id) ? b[kind].filter((x) => x !== id) : [...b[kind], id]
    const next = { ...bindings, [roleId]: { ...b, [kind]: list } }
    if (!next[roleId].userIds.length && !next[roleId].groupIds.length) delete next[roleId]
    setBindings(next)
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-2">
      <Panel title="Case type" className="lg:col-span-2">
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
          <Field label="Name">
            <TextInput value={config.caseTypeName} onChange={(e) => update((d) => void (d.caseTypeName = e.target.value))} />
          </Field>
          <Field label="Case number prefix" hint={`Cases are numbered ${config.prefix || 'PREFIX'}1, ${config.prefix || 'PREFIX'}2 …`}>
            <TextInput
              value={config.prefix}
              maxLength={6}
              className="font-mono uppercase"
              onChange={(e) => update((d) => void (d.prefix = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')))}
            />
          </Field>
          <Field label="Security level" hint="1 = everyone with access to the module">
            <Select
              value={String(config.securityLevel)}
              onChange={(v) => update((d) => void (d.securityLevel = Number(v)))}
              options={Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
            />
          </Field>
        </div>
        <Field label="Description" className="mt-4">
          <TextArea value={config.description} rows={3} onChange={(e) => update((d) => void (d.description = e.target.value))} />
        </Field>
      </Panel>

      <Panel title="Roles" action={<span className="text-xs text-ink-4">Who works with the case</span>}>
        <ul className="space-y-3">
          {config.roles.map((r, i) => (
            <li key={r.id} className="rounded-[2px] border border-rule-soft p-3">
              <div className="flex items-start gap-2">
                <div className="grid flex-1 gap-2 sm:grid-cols-[1fr_auto]">
                  <TextInput value={r.name} aria-label="Role name" onChange={(e) => update((d) => void (d.roles[i].name = e.target.value))} />
                  <div className="flex rounded-[2px] border border-rule p-0.5" role="radiogroup" aria-label="Role kind">
                    {(['user', 'group'] as const).map((k) => (
                      <button
                        key={k}
                        role="radio"
                        aria-checked={r.kind === k}
                        onClick={() => update((d) => void (d.roles[i].kind = k))}
                        className={cn('rounded-[2px] px-2.5 py-1 text-xs', r.kind === k ? 'bg-ink text-paper' : 'text-ink-3 hover:bg-paper-2')}
                      >
                        {k === 'user' ? 'One person' : 'Group inbox'}
                      </button>
                    ))}
                  </div>
                  <TextInput
                    value={r.description}
                    placeholder="What the role does"
                    aria-label="Role description"
                    className="sm:col-span-2 h-8 text-xs"
                    onChange={(e) => update((d) => void (d.roles[i].description = e.target.value))}
                  />
                </div>
                <RowActions
                  index={i}
                  count={config.roles.length}
                  label={r.name}
                  onMove={(to) => update((d) => move(d.roles, i, to))}
                  onDelete={() =>
                    update((d) => {
                      d.roles.splice(i, 1)
                      for (const p of d.phases) {
                        delete p.permissions[r.id]
                        p.responsibleRoleIds = p.responsibleRoleIds.filter((x) => x !== r.id)
                      }
                      for (const f of d.fields) if (f.assignsRoleId === r.id) f.assignsRoleId = null
                    })
                  }
                />
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-xs text-ink-4"><Users size={12} /> Held by</span>
                {groups.map((g) => (
                  <Chip key={g.id} on={binding(r.id).groupIds.includes(g.id)} onClick={() => toggleBinding(r.id, 'groupIds', g.id)} title={`${g.members.length} members`}>
                    {g.name}
                  </Chip>
                ))}
                <Select
                  value=""
                  placeholder="+ person…"
                  className="h-7 w-36 text-xs"
                  onChange={(v) => v && toggleBinding(r.id, 'userIds', v)}
                  options={users.filter((u) => !binding(r.id).userIds.includes(u.id)).map((u) => ({ value: u.id, label: u.name }))}
                />
                {binding(r.id).userIds.map((id) => (
                  <Chip key={id} on onClick={() => toggleBinding(r.id, 'userIds', id)} title="Remove">
                    {users.find((u) => u.id === id)?.name ?? id} ×
                  </Chip>
                ))}
                {!binding(r.id).groupIds.length && !binding(r.id).userIds.length && (
                  <span className="text-xs text-ink-4">
                    {r.kind === 'group' ? '— nobody yet: bind a group so the inbox works' : 'set on each case (creator or assignment field)'}
                  </span>
                )}
              </div>
              {!usedRole(r.id) && <p className="mt-1.5 text-xs text-warn-ink">Not used in any phase or field yet</p>}
            </li>
          ))}
        </ul>
        <div className="mt-3">
          <AddButton onClick={() => update((d) => void d.roles.push({ id: makeId('New role', d.roles.map((x) => x.id)), name: 'New role', description: '', kind: 'user' }))}>
            Add role
          </AddButton>
        </div>
      </Panel>

      <Panel title="Registries" action={<span className="text-xs text-ink-4">Value lists for choice fields</span>}>
        <ul className="space-y-3">
          {config.registries.map((r, i) => {
            const parent = config.registries.find((x) => x.id === r.parentRegistryId)
            const usedBy = config.fields.filter((f) => f.registryId === r.id)
            return (
              <li key={r.id} className="rounded-[2px] border border-rule-soft p-3">
                <div className="flex items-start gap-2">
                  <div className="grid flex-1 gap-2">
                    <TextInput value={r.name} aria-label="Registry name" onChange={(e) => update((d) => void (d.registries[i].name = e.target.value))} />
                    {r.id === 'r-users' ? (
                      <p className="text-xs text-ink-4">The system&apos;s users — people fields pick from them.</p>
                    ) : (
                      <TextArea
                        aria-label="Values, one per line"
                        value={r.values.join('\n')}
                        rows={Math.min(6, Math.max(2, r.values.length))}
                        placeholder="One value per line"
                        onChange={(e) => update((d) => void (d.registries[i].values = e.target.value.split('\n')))}
                        onBlur={() => update((d) => void (d.registries[i].values = d.registries[i].values.map((v) => v.trim()).filter(Boolean)))}
                      />
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-ink-4">
                      <span>Sub-choice of</span>
                      <Select
                        value={r.parentRegistryId ?? ''}
                        placeholder="— none —"
                        className="h-7 w-44 text-xs"
                        onChange={(v) => update((d) => void (d.registries[i].parentRegistryId = v || null))}
                        options={config.registries.filter((x) => x.id !== r.id && x.id !== 'r-users').map((x) => ({ value: x.id, label: x.name }))}
                      />
                      <span>· used by {usedBy.length ? usedBy.map((f) => f.name).join(', ') : 'no fields'}</span>
                    </div>
                    {parent && r.values.length > 0 && (
                      <div className="grid gap-1 sm:grid-cols-2">
                        {r.values.filter(Boolean).map((v) => (
                          <label key={v} className="flex items-center gap-2 text-xs text-ink-3">
                            <span className="w-28 truncate">{v}</span>
                            <Select
                              value={r.parents[v] ?? ''}
                              placeholder={`any ${parent.name}`}
                              className="h-7 flex-1 text-xs"
                              onChange={(pv) =>
                                update((d) => {
                                  if (pv) d.registries[i].parents[v] = pv
                                  else delete d.registries[i].parents[v]
                                })
                              }
                              options={parent.values.map((pv) => ({ value: pv, label: pv }))}
                            />
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <RowActions
                    index={i}
                    count={config.registries.length}
                    label={r.name}
                    onMove={(to) => update((d) => move(d.registries, i, to))}
                    onDelete={() =>
                      update((d) => {
                        d.registries.splice(i, 1)
                        for (const f of d.fields) if (f.registryId === r.id) f.registryId = null
                        for (const x of d.registries) if (x.parentRegistryId === r.id) x.parentRegistryId = null
                      })
                    }
                  />
                </div>
              </li>
            )
          })}
        </ul>
        <div className="mt-3">
          <AddButton onClick={() => update((d) => void d.registries.push({ id: `r-${makeId('List', d.registries.map((x) => x.id.replace(/^r-/, '')))}`, name: 'New list', values: [], comments: '', parentRegistryId: null, parents: {} }))}>
            Add registry
          </AddButton>
        </div>
      </Panel>

      <Panel title="Notes" className="lg:col-span-2">
        <TextArea value={config.notes} rows={4} placeholder="Background, decisions from the workshop, open questions…" onChange={(e) => update((d) => void (d.notes = e.target.value))} />
      </Panel>
    </div>
  )
}
