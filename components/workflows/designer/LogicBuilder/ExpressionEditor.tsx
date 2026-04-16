'use client'

import { useState, useEffect } from 'react'
import { ExpressionParser } from '@/lib/expression-parser/parser'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const parser = new ExpressionParser()

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function ExpressionEditor({ value, onChange, placeholder, className }: Props) {
  const [validation, setValidation] = useState<{ valid: boolean; error?: string } | null>(null)

  useEffect(() => {
    if (!value?.trim()) { setValidation(null); return }
    const result = parser.validate(value)
    setValidation(result)
  }, [value])

  return (
    <div className="space-y-1">
      <div className="relative">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? 'e.g. variables.amount > 1000'}
          spellCheck={false}
          className={cn(
            'w-full font-mono text-xs rounded-md border px-3 py-2 pr-8 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500',
            validation?.valid === false
              ? 'border-red-300 focus:ring-red-400'
              : 'border-slate-200',
            className
          )}
        />
        {validation && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            {validation.valid
              ? <CheckCircle2 size={14} className="text-green-500" />
              : <AlertCircle size={14} className="text-red-400" />
            }
          </div>
        )}
      </div>
      {validation?.valid === false && (
        <p className="text-[10px] text-red-500">{validation.error}</p>
      )}
    </div>
  )
}
