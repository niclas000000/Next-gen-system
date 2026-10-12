import { describe, expect, it } from 'vitest'
import { builtInConfig } from '@/lib/case-config/fixtures'
import { dimensionsFor } from './service'

describe('report dimensions', () => {
  const dims = dimensionsFor(['DEV', 'CAPA', 'CC'].map((p) => ({ name: builtInConfig(p).caseTypeName, config: builtInConfig(p) })))

  it('merges fields with the same property category across case types', () => {
    expect(dims.find((d) => d.key === 'p:ownership')).toMatchObject({ name: 'Ownership', caseTypes: ['Deviation', 'CAPA'] })
  })

  it('merges fields with the same name when they have no category', () => {
    expect(dims.find((d) => d.key === 'p:affected site')?.caseTypes).toEqual(['Deviation', 'CAPA', 'Change control'])
  })

  it('lists built-in dimensions first and shared properties before single ones', () => {
    expect(dims.slice(0, 4).map((d) => d.key)).toEqual(['caseType', 'status', 'phase', 'creator'])
    const props = dims.filter((d) => d.kind === 'property')
    const firstSingle = props.findIndex((d) => d.caseTypes.length === 1)
    expect(props.slice(firstSingle).every((d) => d.caseTypes.length === 1)).toBe(true)
  })
})
