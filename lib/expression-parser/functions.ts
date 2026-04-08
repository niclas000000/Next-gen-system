// Built-in expression functions
export const builtinFunctions: Record<string, (...args: unknown[]) => unknown> = {
  // Math
  SUM: (...args: unknown[]) => (args.flat() as number[]).reduce((a, b) => a + b, 0),
  AVG: (...args: unknown[]) => {
    const flat = args.flat() as number[]
    return flat.reduce((a, b) => a + b, 0) / flat.length
  },
  MIN: (...args: unknown[]) => Math.min(...(args.flat() as number[])),
  MAX: (...args: unknown[]) => Math.max(...(args.flat() as number[])),
  ROUND: (n: unknown, d = 0) => Math.round((n as number) * 10 ** (d as number)) / 10 ** (d as number),
  FLOOR: (n: unknown) => Math.floor(n as number),
  CEIL: (n: unknown) => Math.ceil(n as number),
  ABS: (n: unknown) => Math.abs(n as number),

  // String
  CONCAT: (...args: unknown[]) => args.join(''),
  UPPER: (s: unknown) => String(s).toUpperCase(),
  LOWER: (s: unknown) => String(s).toLowerCase(),
  TRIM: (s: unknown) => String(s).trim(),
  LENGTH: (s: unknown) => String(s).length,

  // Logic
  IF: (cond: unknown, a: unknown, b: unknown) => (cond ? a : b),
  AND: (...args: unknown[]) => args.every(Boolean),
  OR: (...args: unknown[]) => args.some(Boolean),
  NOT: (v: unknown) => !v,
  COALESCE: (...args: unknown[]) => args.find((v) => v != null),

  // Array
  COUNT: (arr: unknown) => (Array.isArray(arr) ? arr.length : 0),
  JOIN: (arr: unknown, sep = ',') => (Array.isArray(arr) ? arr.join(sep as string) : ''),
}
