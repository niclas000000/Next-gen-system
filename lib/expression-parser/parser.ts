// TODO: Implement expression parser
export class ExpressionParser {
  parse(_expression: string) {
    throw new Error('Not implemented')
  }

  evaluate(_expression: string, _context: Record<string, unknown>): unknown {
    throw new Error('Not implemented')
  }

  validate(_expression: string): { valid: boolean; error?: string } {
    return { valid: true }
  }
}
