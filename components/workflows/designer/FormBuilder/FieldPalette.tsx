'use client'

import { useFormBuilderStore } from '@/lib/stores/form-builder-store'
import { Type, AlignLeft, Hash, Calendar, ChevronDown, CheckSquare, ToggleLeft, Upload, User, Table, Minus, Heading, List } from 'lucide-react'
import type { FieldType } from '@/types/field'

const groups: { label: string; fields: { type: FieldType; label: string; icon: React.ReactNode }[] }[] = [
  {
    label: 'Input',
    fields: [
      { type: 'text',        label: 'Text',        icon: <Type size={13} /> },
      { type: 'textarea',    label: 'Text Area',   icon: <AlignLeft size={13} /> },
      { type: 'number',      label: 'Number',      icon: <Hash size={13} /> },
      { type: 'date',        label: 'Date',        icon: <Calendar size={13} /> },
    ],
  },
  {
    label: 'Choice',
    fields: [
      { type: 'select',      label: 'Dropdown',    icon: <ChevronDown size={13} /> },
      { type: 'multiselect', label: 'Multi Select',icon: <List size={13} /> },
      { type: 'radio',       label: 'Radio',       icon: <List size={13} /> },
      { type: 'checkbox',    label: 'Checkbox',    icon: <CheckSquare size={13} /> },
      { type: 'toggle',      label: 'Toggle',      icon: <ToggleLeft size={13} /> },
    ],
  },
  {
    label: 'Advanced',
    fields: [
      { type: 'file',        label: 'File Upload', icon: <Upload size={13} /> },
      { type: 'user',        label: 'User Picker', icon: <User size={13} /> },
      { type: 'table',       label: 'Table',       icon: <Table size={13} /> },
    ],
  },
  {
    label: 'Layout',
    fields: [
      { type: 'section',     label: 'Section',     icon: <Heading size={13} /> },
      { type: 'heading',     label: 'Heading',     icon: <Heading size={13} /> },
      { type: 'divider',     label: 'Divider',     icon: <Minus size={13} /> },
    ],
  },
]

export function FieldPalette() {
  const { addField } = useFormBuilderStore()

  return (
    <div className="flex-1 p-3 space-y-4">
      <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Add field</p>
      {groups.map((group) => (
        <div key={group.label}>
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mb-1">{group.label}</p>
          <div className="space-y-0.5">
            {group.fields.map((f) => (
              <button
                key={f.type}
                onClick={() => addField(f.type)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs text-slate-600 hover:bg-white hover:shadow-sm transition-all text-left"
              >
                <span className="text-slate-400">{f.icon}</span>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
