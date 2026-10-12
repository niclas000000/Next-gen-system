'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FIELD_TYPE_LABELS, FieldTypes, LAYOUT_FIELD_TYPES, type FieldType } from '@/lib/case-config/schema'
import { useEditor } from './EditorContext'
import { AddButton, RowActions, Select, TextInput, makeId, move } from './controls'

const REGISTRY_TYPES: FieldType[] = ['registryDropdown', 'registrySearch']

export function FieldsTab() {
  const { config, update, focusId, goTo, caseTypeNames } = useEditor()
  const [q, setQ] = useState('')
  const refs = useRef<Record<string, HTMLTableRowElement | null>>({})

  useEffect(() => {
    if (focusId) refs.current[focusId]?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [focusId])

  const sections = useMemo(() => [...new Set(config.fields.map((f) => f.section).filter(Boolean))], [config.fields])
  const shownIn = (id: string) => config.phases.filter((p) => p.fields[id] && p.fields[id].access !== 'hidden').length

  const rows = config.fields
    .map((f, index) => ({ f, index }))
    .filter(({ f }) => !q || `${f.name} ${f.section} ${f.type}`.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="flex-1 text-sm text-ink-3">
          A field is defined once and shown in the phases you choose in the <button className="text-nw-accent hover:underline" onClick={() => goTo('matrix')}>field matrix</button>.
        </p>
        <div className="flex h-9 w-72 items-center gap-2 rounded-[2px] border border-rule bg-surface px-2.5 focus-within:ring-2 focus-within:ring-nw-accent">
          <Search size={13} className="text-ink-4" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Filter ${config.fields.length} fields`} className="flex-1 bg-transparent text-sm outline-none" />
        </div>
      </div>

      <datalist id="field-sections">
        {sections.map((s) => <option key={s} value={s} />)}
      </datalist>

      <div className="overflow-x-auto rounded-[2px] border border-rule bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rule text-left">
              {['Name', 'Type', 'Section', 'Registry / role', 'Multi', 'Mandatory', 'Phases', ''].map((h) => (
                <th key={h} className="mono-meta whitespace-nowrap px-3 py-2.5 font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ f, index }) => {
              const isRegistry = REGISTRY_TYPES.includes(f.type)
              const layout = LAYOUT_FIELD_TYPES.includes(f.type)
              return (
                <tr
                  key={f.id}
                  ref={(el) => void (refs.current[f.id] = el)}
                  className={cn('border-b border-rule-soft align-top last:border-0', focusId === f.id && 'bg-accent-tint')}
                >
                  <td className="min-w-[220px] px-3 py-2">
                    <TextInput value={f.name} aria-label="Field name" className="h-8" onChange={(e) => update((d) => void (d.fields[index].name = e.target.value))} />
                  </td>
                  <td className="px-3 py-2">
                    <Select
                      value={f.type}
                      aria-label="Field type"
                      className="h-8 w-48"
                      onChange={(v) => update((d) => void (d.fields[index].type = v as FieldType))}
                      options={FieldTypes.map((t) => ({ value: t, label: FIELD_TYPE_LABELS[t] }))}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <TextInput value={f.section} list="field-sections" aria-label="Section" className="h-8 w-44" onChange={(e) => update((d) => void (d.fields[index].section = e.target.value))} />
                  </td>
                  <td className="px-3 py-2">
                    {isRegistry ? (
                      <div className="space-y-1.5">
                        <Select
                          value={f.registryId ?? ''}
                          placeholder="— registry —"
                          aria-label="Registry"
                          className="h-8 w-48"
                          onChange={(v) => update((d) => void (d.fields[index].registryId = v || null))}
                          options={config.registries.map((r) => ({ value: r.id, label: r.name }))}
                        />
                        {f.type === 'registrySearch' && (
                          <Select
                            value={f.assignsRoleId ?? ''}
                            placeholder="Doesn't assign a role"
                            aria-label="Assigns role"
                            className="h-8 w-48 text-xs"
                            onChange={(v) => update((d) => void (d.fields[index].assignsRoleId = v || null))}
                            options={config.roles.map((r) => ({ value: r.id, label: `Sets role: ${r.name}` }))}
                          />
                        )}
                      </div>
                    ) : f.type === 'subcase' ? (
                      <div className="space-y-1.5">
                        <Select
                          value={f.subcaseTypeName ?? ''}
                          placeholder={`Type named “${f.name}”`}
                          aria-label="Creates sub cases of"
                          className="h-8 w-48"
                          onChange={(v) => update((d) => void (d.fields[index].subcaseTypeName = v || null))}
                          options={caseTypeNames.map((n) => ({ value: n, label: `Creates: ${n}` }))}
                        />
                        <label className="flex items-center gap-1.5 text-xs text-ink-3">
                          <input
                            type="checkbox"
                            checked={f.subcasesMustBeClosed}
                            onChange={(e) => update((d) => void (d.fields[index].subcasesMustBeClosed = e.target.checked))}
                            className="accent-[var(--nw-accent)]"
                          />
                          Must be closed before moving on
                        </label>
                      </div>
                    ) : (
                      <span className="text-xs text-ink-4">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {isRegistry && <input type="checkbox" aria-label="Several values" checked={f.multi} onChange={(e) => update((d) => void (d.fields[index].multi = e.target.checked))} className="accent-[var(--nw-accent)]" />}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {!layout && <input type="checkbox" aria-label="Mandatory" checked={f.mandatory} onChange={(e) => update((d) => void (d.fields[index].mandatory = e.target.checked))} className="accent-[var(--nw-accent)]" />}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs text-ink-4">
                    {shownIn(f.id) ? `${shownIn(f.id)} of ${config.phases.length}` : <span className="text-warn-ink">not shown</span>}
                  </td>
                  <td className="px-2 py-1.5">
                    <RowActions
                      index={index}
                      count={config.fields.length}
                      label={f.name}
                      onMove={(to) => update((d) => move(d.fields, index, to))}
                      onDelete={() =>
                        update((d) => {
                          d.fields.splice(index, 1)
                          for (const p of d.phases) {
                            delete p.fields[f.id]
                            p.layout = p.layout.map((r) => (r.type === 'fields' ? { ...r, cells: r.cells.filter((c) => c.fieldId !== f.id) } : r))
                            p.rules = p.rules
                              .filter((r) => r.when?.fieldId !== f.id)
                              .map((r) => ('fieldIds' in r ? { ...r, fieldIds: r.fieldIds.filter((x) => x !== f.id) } : r))
                          }
                        })
                      }
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!rows.length && <p className="px-4 py-8 text-center text-sm text-ink-4">No fields match the filter.</p>}
      </div>
      <AddButton
        onClick={() =>
          update((d) => {
            const id = makeId('New field', d.fields.map((f) => f.id))
            d.fields.push({ id, name: 'New field', type: 'text', section: sections[sections.length - 1] ?? '', mandatory: false, registryId: null, multi: false, comments: '', assignsRoleId: null, subcaseTypeName: null, subcasesMustBeClosed: false })
            // Editable in the first phase so it shows up right away; adjust in the matrix
            if (d.phases[0]) d.phases[0].fields[id] = { access: 'edit', mandatory: null, title: null }
          })
        }
      >
        Add field
      </AddButton>
    </div>
  )
}
