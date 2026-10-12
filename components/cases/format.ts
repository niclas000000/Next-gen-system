import { format, isValid, parseISO } from 'date-fns'
import type { Field } from '@/lib/case-config/schema'

export interface UserRef {
  id: string
  name: string
  email?: string
}

export const asList = (v: string | string[] | undefined): string[] =>
  Array.isArray(v) ? v.filter(Boolean) : v ? [v] : []

export function formatDate(v: string | Date | null | undefined, withTime = false): string {
  if (!v) return ''
  const d = typeof v === 'string' ? parseISO(v) : v
  if (!isValid(d)) return String(v)
  return format(d, withTime ? 'd MMM yyyy, HH:mm' : 'd MMM yyyy')
}

/** A field value as text for read-only display; empty string when there is nothing. */
export function displayValue(field: Field, value: string | string[] | undefined, users: UserRef[]): string {
  const list = asList(value)
  if (!list.length) return field.type === 'checkbox' ? 'No' : ''
  switch (field.type) {
    case 'registrySearch':
      return list.map((id) => users.find((u) => u.id === id)?.name ?? id).join(', ')
    case 'date':
      return list.map((d) => formatDate(d, d.includes('T'))).join(', ')
    default:
      return list.join(', ')
  }
}

export const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
