import { format, addDays, addHours, addMinutes, differenceInDays, differenceInHours } from 'date-fns'

export const builtinFunctions: Record<string, (...args: unknown[]) => unknown> = {
  // Math
  SUM: (...args: unknown[]) => (args.flat() as number[]).reduce((a, b) => a + b, 0),
  AVG: (...args: unknown[]) => {
    const flat = args.flat() as number[]
    return flat.reduce((a, b) => a + b, 0) / flat.length
  },
  MIN: (...args: unknown[]) => Math.min(...(args.flat() as number[])),
  MAX: (...args: unknown[]) => Math.max(...(args.flat() as number[])),
  ROUND: (n: unknown, d: unknown = 0) => Math.round((n as number) * 10 ** (d as number)) / 10 ** (d as number),
  FLOOR: (n: unknown) => Math.floor(n as number),
  CEIL: (n: unknown) => Math.ceil(n as number),
  ABS: (n: unknown) => Math.abs(n as number),

  // String
  CONCAT: (...args: unknown[]) => args.join(''),
  UPPER: (s: unknown) => String(s).toUpperCase(),
  LOWER: (s: unknown) => String(s).toLowerCase(),
  TRIM: (s: unknown) => String(s).trim(),
  SUBSTRING: (s: unknown, start: unknown, end?: unknown) =>
    String(s).substring(start as number, end as number | undefined),
  REPLACE: (s: unknown, from: unknown, to: unknown) =>
    String(s).split(String(from)).join(String(to)),
  LENGTH: (s: unknown) => (Array.isArray(s) ? s.length : String(s).length),

  // Date
  NOW: () => new Date().toISOString(),
  TODAY: () => new Date().toISOString().slice(0, 10),
  DATEDIFF: (a: unknown, b: unknown) =>
    differenceInDays(new Date(a as string), new Date(b as string)),
  DATEDIFF_HOURS: (a: unknown, b: unknown) =>
    differenceInHours(new Date(a as string), new Date(b as string)),
  DATEADD: (d: unknown, n: unknown, unit: unknown = 'days') => {
    const date = new Date(d as string)
    const amount = n as number
    if (unit === 'hours') return addHours(date, amount).toISOString()
    if (unit === 'minutes') return addMinutes(date, amount).toISOString()
    return addDays(date, amount).toISOString()
  },
  FORMAT_DATE: (d: unknown, fmt: unknown = 'yyyy-MM-dd') =>
    format(new Date(d as string), fmt as string),
  WORKDAYS: (a: unknown, b: unknown) => {
    // Simple business day count (Mon–Fri)
    let count = 0
    const start = new Date(a as string)
    const end = new Date(b as string)
    const cur = new Date(start)
    while (cur <= end) {
      const day = cur.getDay()
      if (day !== 0 && day !== 6) count++
      cur.setDate(cur.getDate() + 1)
    }
    return count
  },

  // Logic
  IF: (cond: unknown, a: unknown, b: unknown) => (cond ? a : b),
  AND: (...args: unknown[]) => args.every(Boolean),
  OR: (...args: unknown[]) => args.some(Boolean),
  NOT: (v: unknown) => !v,
  SWITCH: (val: unknown, ...pairs: unknown[]) => {
    for (let i = 0; i < pairs.length - 1; i += 2) {
      if (val == pairs[i]) return pairs[i + 1]
    }
    return pairs.length % 2 === 1 ? pairs[pairs.length - 1] : null
  },
  COALESCE: (...args: unknown[]) => args.find((v) => v != null) ?? null,

  // Array
  FILTER: (arr: unknown, _fn: unknown) => (Array.isArray(arr) ? arr : []),
  MAP: (arr: unknown, _fn: unknown) => (Array.isArray(arr) ? arr : []),
  FIND: (arr: unknown, _fn: unknown) => (Array.isArray(arr) ? arr[0] : null),
  COUNT: (arr: unknown) => (Array.isArray(arr) ? arr.length : 0),
  JOIN: (arr: unknown, sep: unknown = ',') => (Array.isArray(arr) ? arr.join(sep as string) : ''),

  // Workflow (resolved at runtime via context)
  GET_VARIABLE: (ctx: unknown, key: unknown) =>
    (ctx as Record<string, unknown>)?.[key as string] ?? null,
}
