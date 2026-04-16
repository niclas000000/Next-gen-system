export type TokenType =
  | 'NUMBER'
  | 'STRING'
  | 'IDENTIFIER'
  | 'OPERATOR'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'DOT'
  | 'EOF'

export interface Token {
  type: TokenType
  value: string
  position: number
}

const OPERATORS = new Set(['==', '!=', '>=', '<=', '>', '<', '+', '-', '*', '/', 'AND', 'OR', 'NOT', 'contains', 'not_contains', 'is_empty', 'is_not_empty'])

export class Tokenizer {
  private pos = 0
  private input = ''

  tokenize(expression: string): Token[] {
    this.pos = 0
    this.input = expression
    const tokens: Token[] = []

    while (this.pos < this.input.length) {
      this.skipWhitespace()
      if (this.pos >= this.input.length) break

      const token = this.nextToken()
      if (token) tokens.push(token)
    }

    tokens.push({ type: 'EOF', value: '', position: this.pos })
    return tokens
  }

  private skipWhitespace() {
    while (this.pos < this.input.length && /\s/.test(this.input[this.pos])) {
      this.pos++
    }
  }

  private nextToken(): Token | null {
    const start = this.pos
    const ch = this.input[this.pos]

    // String literals
    if (ch === '"' || ch === "'") {
      return this.readString(ch, start)
    }

    // Numbers
    if (/[0-9]/.test(ch) || (ch === '-' && /[0-9]/.test(this.input[this.pos + 1] ?? ''))) {
      return this.readNumber(start)
    }

    // Two-char operators
    const two = this.input.slice(this.pos, this.pos + 2)
    if (['==', '!=', '>=', '<='].includes(two)) {
      this.pos += 2
      return { type: 'OPERATOR', value: two, position: start }
    }

    // Single-char operators/punctuation
    if (ch === '>') { this.pos++; return { type: 'OPERATOR', value: '>', position: start } }
    if (ch === '<') { this.pos++; return { type: 'OPERATOR', value: '<', position: start } }
    if (ch === '+') { this.pos++; return { type: 'OPERATOR', value: '+', position: start } }
    if (ch === '-') { this.pos++; return { type: 'OPERATOR', value: '-', position: start } }
    if (ch === '*') { this.pos++; return { type: 'OPERATOR', value: '*', position: start } }
    if (ch === '/') { this.pos++; return { type: 'OPERATOR', value: '/', position: start } }
    if (ch === '(') { this.pos++; return { type: 'LPAREN', value: '(', position: start } }
    if (ch === ')') { this.pos++; return { type: 'RPAREN', value: ')', position: start } }
    if (ch === ',') { this.pos++; return { type: 'COMMA', value: ',', position: start } }
    if (ch === '.') { this.pos++; return { type: 'DOT', value: '.', position: start } }

    // Identifiers and keywords
    if (/[a-zA-Z_]/.test(ch)) {
      return this.readIdentifier(start)
    }

    // Skip unknown
    this.pos++
    return null
  }

  private readString(quote: string, start: number): Token {
    this.pos++ // skip opening quote
    let value = ''
    while (this.pos < this.input.length && this.input[this.pos] !== quote) {
      if (this.input[this.pos] === '\\') {
        this.pos++
        value += this.input[this.pos] ?? ''
      } else {
        value += this.input[this.pos]
      }
      this.pos++
    }
    this.pos++ // skip closing quote
    return { type: 'STRING', value, position: start }
  }

  private readNumber(start: number): Token {
    let value = ''
    if (this.input[this.pos] === '-') { value += '-'; this.pos++ }
    while (this.pos < this.input.length && /[0-9.]/.test(this.input[this.pos])) {
      value += this.input[this.pos]
      this.pos++
    }
    return { type: 'NUMBER', value, position: start }
  }

  private readIdentifier(start: number): Token {
    let value = ''
    while (this.pos < this.input.length && /[a-zA-Z0-9_]/.test(this.input[this.pos])) {
      value += this.input[this.pos]
      this.pos++
    }
    // Check if it's a keyword operator
    if (OPERATORS.has(value)) {
      return { type: 'OPERATOR', value, position: start }
    }
    // Booleans / null
    if (value === 'true' || value === 'false' || value === 'null') {
      return { type: 'IDENTIFIER', value, position: start }
    }
    return { type: 'IDENTIFIER', value, position: start }
  }
}
