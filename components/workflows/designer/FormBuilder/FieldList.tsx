'use client'

import { useFormBuilderStore } from '@/lib/stores/form-builder-store'
import { Trash2, GripVertical, ChevronUp, ChevronDown, Eye, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const typeColors: Record<string, string> = {
  text: 'bg-blue-50 text-blue-600', textarea: 'bg-blue-50 text-blue-600',
  number: 'bg-purple-50 text-purple-600', date: 'bg-green-50 text-green-600',
  select: 'bg-orange-50 text-orange-600', multiselect: 'bg-orange-50 text-orange-600',
  radio: 'bg-orange-50 text-orange-600', checkbox: 'bg-teal-50 text-teal-600',
  toggle: 'bg-teal-50 text-teal-600', file: 'bg-red-50 text-red-600',
  user: 'bg-indigo-50 text-indigo-600', table: '',
  section: '', heading: '', divider: '',
}

export function FieldList() {
  const { fields, selectedFieldId, selectField, removeField, moveField } = useFormBuilderStore()

  if (fields.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8" style={{ color: 'var(--ink-4)' }}>
        <p className="text-sm font-medium" style={{ color: 'var(--ink-3)' }}>No fields yet</p>
        <p className="text-xs mt-1">Click a field type on the left to add it.</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-2">
      {fields.map((field, i) => (
        <div
          key={field.id}
          onClick={() => selectField(field.id)}
          className="group flex items-center gap-2 px-3 py-2.5 rounded-[2px] border cursor-pointer transition-all"
          style={{
            borderColor: selectedFieldId === field.id ? 'var(--nw-accent)' : 'var(--rule)',
            background: selectedFieldId === field.id ? 'var(--accent-tint)' : 'var(--surface)',
          }}
        >
          {/* Drag handle (visual only) */}
          <GripVertical size={14} className="shrink-0" style={{ color: 'var(--rule)' }} />

          {/* Field info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{field.label || field.name}</p>
            {field.description && (
              <p className="text-xs truncate" style={{ color: 'var(--ink-4)' }}>{field.description}</p>
            )}
          </div>

          {/* Type badge */}
          <Badge variant="outline" className={`text-[10px] shrink-0 border-0 ${typeColors[field.type] ?? ''}`}
            style={!typeColors[field.type] ? { background: 'var(--paper-3)', color: 'var(--ink-4)' } : {}}>
            {field.type}
          </Badge>

          {/* Required indicator */}
          {field.validation.some((v) => v.type === 'required') && (
            <span className="text-red-400 text-xs shrink-0">*</span>
          )}

          {/* Conditional visibility indicator */}
          {field.conditional && (
            <Eye size={12} className="shrink-0" style={{ color: 'var(--nw-accent)' }} title="Has visibility condition" />
          )}

          {/* Cascade indicator */}
          {field.dataSource?.filterByField && (
            <Link2 size={12} className="shrink-0" style={{ color: 'var(--ink-4)' }} title={`Filtered by: ${field.dataSource.filterByField}`} />
          )}

          {/* Move up/down */}
          <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" style={{ color: 'var(--ink-4)' }}>
            <button onClick={(e) => { e.stopPropagation(); moveField(i, i - 1) }} disabled={i === 0} className="disabled:opacity-20">
              <ChevronUp size={12} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); moveField(i, i + 1) }} disabled={i === fields.length - 1} className="disabled:opacity-20">
              <ChevronDown size={12} />
            </button>
          </div>

          {/* Delete */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            style={{ color: 'var(--ink-4)' }}
            onClick={(e) => { e.stopPropagation(); removeField(field.id) }}
          >
            <Trash2 size={12} />
          </Button>
        </div>
      ))}
    </div>
  )
}
