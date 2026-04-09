'use client'

import { create } from 'zustand'
import type { FormField, FieldType, FormSettings } from '@/types/field'

function makeField(type: FieldType): FormField {
  const base = {
    id: `field-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    name: `field_${Date.now()}`,
    label: labelFor(type),
    validation: [],
    properties: {},
  }
  if (type === 'select' || type === 'multiselect' || type === 'radio') {
    return { ...base, dataSource: { type: 'static', options: [{ label: 'Option 1', value: 'option_1' }] } }
  }
  return base
}

function labelFor(type: FieldType): string {
  const labels: Partial<Record<FieldType, string>> = {
    text: 'Text Field', textarea: 'Text Area', richtext: 'Rich Text',
    number: 'Number', date: 'Date', time: 'Time', datetime: 'Date & Time',
    select: 'Dropdown', multiselect: 'Multi Select', radio: 'Radio Group',
    checkbox: 'Checkbox', toggle: 'Toggle', file: 'File Upload',
    user: 'User Picker', table: 'Table', section: 'Section', heading: 'Heading',
    paragraph: 'Paragraph', divider: 'Divider',
  }
  return labels[type] ?? type
}

interface FormBuilderState {
  nodeId: string | null
  formName: string
  fields: FormField[]
  settings: FormSettings
  selectedFieldId: string | null
  isDirty: boolean

  loadForm: (nodeId: string, fields: FormField[], settings?: FormSettings) => void
  addField: (type: FieldType) => void
  updateField: (id: string, updates: Partial<FormField>) => void
  removeField: (id: string) => void
  moveField: (fromIndex: number, toIndex: number) => void
  selectField: (id: string | null) => void
  updateSettings: (s: Partial<FormSettings>) => void
  markDirty: () => void
}

const defaultSettings: FormSettings = {
  submitButtonText: 'Submit',
  saveDraftEnabled: false,
  layout: 'default',
}

export const useFormBuilderStore = create<FormBuilderState>((set) => ({
  nodeId: null,
  formName: 'Form',
  fields: [],
  settings: defaultSettings,
  selectedFieldId: null,
  isDirty: false,

  loadForm: (nodeId, fields, settings) =>
    set({ nodeId, fields, settings: settings ?? defaultSettings, selectedFieldId: null, isDirty: false }),

  addField: (type) => {
    const field = makeField(type)
    set((s) => ({ fields: [...s.fields, field], selectedFieldId: field.id, isDirty: true }))
  },

  updateField: (id, updates) =>
    set((s) => ({
      fields: s.fields.map((f) => (f.id === id ? { ...f, ...updates } : f)),
      isDirty: true,
    })),

  removeField: (id) =>
    set((s) => ({
      fields: s.fields.filter((f) => f.id !== id),
      selectedFieldId: s.selectedFieldId === id ? null : s.selectedFieldId,
      isDirty: true,
    })),

  moveField: (fromIndex, toIndex) =>
    set((s) => {
      const fields = [...s.fields]
      const [moved] = fields.splice(fromIndex, 1)
      fields.splice(toIndex, 0, moved)
      return { fields, isDirty: true }
    }),

  selectField: (id) => set({ selectedFieldId: id }),

  updateSettings: (updates) =>
    set((s) => ({ settings: { ...s.settings, ...updates }, isDirty: true })),

  markDirty: () => set({ isDirty: true }),
}))
