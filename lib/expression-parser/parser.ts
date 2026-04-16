import { Tokenizer, type Token } from './tokenizer'
import { builtinFunctions } from './functions'

// AST node types
type ASTNode =
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'null' }
  | { kind: 'identifier'; name: string }
  | { kind: 'member'; object: ASTNode; property: string }
  | { kind: 'call'; name: string; args: ASTNode[] }
  | { kind: 'binary'; op: string; left: ASTNode; right: ASTNode }
  | { kind: 'unary'; op: string; operand: ASTNode }

class Parser {
  private tokens: Token[] = []
  private pos = 0

  parse(tokens: Token[]): ASTNode {
    this.tokens = tokens
    this.pos = 0
    const node = this.parseOr()
    return node
  }

  private peek(): Token {
    return this.tokens[this.pos] ?? { type: 'EOF', value: '', position: 0 }
  }

  private consume(): Token {
    return this.tokens[this.pos++] ?? { type: 'EOF', value: '', position: 0 }
  }

  private match(...values: string[]): boolean {
    const t = this.peek()
    return values.includes(t.value)
  }

  private parseOr(): ASTNode {
    let left = this.parseAnd()
    while (this.match('OR')) {
      this.consume()
      const right = this.parseAnd()
      left = { kind: 'binary', op: 'OR', left, right }
    }
    return left
  }

  private parseAnd(): ASTNode {
    let left = this.parseNot()
    while (this.match('AND')) {
      this.consume()
      const right = this.parseNot()
      left = { kind: 'binary', op: 'AND', left, right }
    }
    return left
  }

  private parseNot(): ASTNode {
    if (this.match('NOT')) {
      this.consume()
      return { kind: 'unary', op: 'NOT', operand: this.parseNot() }
    }
    return this.parseComparison()
  }

  private parseComparison(): ASTNode {
    const left = this.parseAddition()
    const op = this.peek().value
    if (['==', '!=', '>', '>=', '<', '<=', 'contains', 'not_contains'].includes(op)) {
      this.consume()
      const right = this.parseAddition()
      return { kind: 'binary', op, left, right }
    }
    if (op === 'is_empty' || op === 'is_not_empty') {
      this.consume()
      return { kind: 'binary', op, left, right: { kind: 'null' } }
    }
    return left
  }

  private parseAddition(): ASTNode {
    let left = this.parseMultiplication()
    while (this.match('+', '-')) {
      const op = this.consume().value
      const right = this.parseMultiplication()
      left = { kind: 'binary', op, left, right }
    }
    return left
  }

  private parseMultiplication(): ASTNode {
    let left = this.parseUnary()
    while (this.match('*', '/')) {
      const op = this.consume().value
      const right = this.parseUnary()
      left = { kind: 'binary', op, left, right }
    }
    return left
  }

  private parseUnary(): ASTNode {
    if (this.match('-')) {
      this.consume()
      return { kind: 'unary', op: '-', operand: this.parsePrimary() }
    }
    return this.parsePrimary()
  }

  private parsePrimary(): ASTNode {
    const t = this.peek()

    if (t.type === 'NUMBER') {
      this.consume()
      return { kind: 'number', value: parseFloat(t.value) }
    }

    if (t.type === 'STRING') {
      this.consume()
      return { kind: 'string', value: t.value }
    }

    if (t.value === 'true') { this.consume(); return { kind: 'boolean', value: true } }
    if (t.value === 'false') { this.consume(); return { kind: 'boolean', value: false } }
    if (t.value === 'null') { this.consume(); return { kind: 'null' } }

    if (t.type === 'LPAREN') {
      this.consume()
      const expr = this.parseOr()
      if (this.peek().type === 'RPAREN') this.consume()
      return expr
    }

    if (t.type === 'IDENTIFIER') {
      this.consume()
      let node: ASTNode = { kind: 'identifier', name: t.value }

      // Member access chain: a.b.c
      while (this.peek().type === 'DOT') {
        this.consume() // consume dot
        const prop = this.consume()
        node = { kind: 'member', object: node, property: prop.value }
      }

      // Function call: NAME(args)
      if (this.peek().type === 'LPAREN' && node.kind === 'identifier') {
        this.consume() // consume (
        const args: ASTNode[] = []
        while (this.peek().type !== 'RPAREN' && this.peek().type !== 'EOF') {
          args.push(this.parseOr())
          if (this.peek().type === 'COMMA') this.consume()
        }
        if (this.peek().type === 'RPAREN') this.consume()
        return { kind: 'call', name: node.name, args }
      }

      return node
    }

    // Fallback: skip unknown token
    this.consume()
    return { kind: 'null' }
  }
}

function resolvePath(obj: unknown, path: string[]): unknown {
  let cur = obj
  for (const key of path) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[key]
  }
  return cur
}

function evalNode(node: ASTNode, context: Record<string, unknown>): unknown {
  switch (node.kind) {
    case 'number': return node.value
    case 'string': return node.value
    case 'boolean': return node.value
    case 'null': return null

    case 'identifier': {
      if (node.name in context) return context[node.name]
      return undefined
    }

    case 'member': {
      // Build full path from nested member access
      const parts: string[] = []
      let cur: ASTNode = node
      while (cur.kind === 'member') {
        parts.unshift(cur.property)
        cur = cur.object
      }
      if (cur.kind === 'identifier') parts.unshift(cur.name)
      return resolvePath(context, parts)
    }

    case 'call': {
      const fn = builtinFunctions[node.name.toUpperCase()]
      if (!fn) throw new Error(`Unknown function: ${node.name}`)
      const args = node.args.map((a) => evalNode(a, context))
      return fn(...args)
    }

    case 'unary': {
      const val = evalNode(node.operand, context)
      if (node.op === '-') return -(val as number)
      if (node.op === 'NOT') return !val
      return val
    }

    case 'binary': {
      const { op, left, right } = node

      if (op === 'AND') return Boolean(evalNode(left, context)) && Boolean(evalNode(right, context))
      if (op === 'OR') return Boolean(evalNode(left, context)) || Boolean(evalNode(right, context))

      const l = evalNode(left, context)
      const r = evalNode(right, context)

      switch (op) {
        case '==': return l == r // intentional loose equality
        case '!=': return l != r
        case '>': return (l as number) > (r as number)
        case '>=': return (l as number) >= (r as number)
        case '<': return (l as number) < (r as number)
        case '<=': return (l as number) <= (r as number)
        case '+': return typeof l === 'string' || typeof r === 'string' ? String(l) + String(r) : (l as number) + (r as number)
        case '-': return (l as number) - (r as number)
        case '*': return (l as number) * (r as number)
        case '/': return (r as number) !== 0 ? (l as number) / (r as number) : null
        case 'contains': return String(l).includes(String(r))
        case 'not_contains': return !String(l).includes(String(r))
        case 'is_empty': return l == null || l === ''
        case 'is_not_empty': return l != null && l !== ''
        default: return null
      }
    }
  }
}

const tokenizer = new Tokenizer()
const parser = new Parser()

export class ExpressionParser {
  evaluate(expression: string, context: Record<string, unknown>): unknown {
    if (!expression?.trim()) return null
    const tokens = tokenizer.tokenize(expression)
    const ast = parser.parse(tokens)
    return evalNode(ast, context)
  }

  evaluateBoolean(expression: string, context: Record<string, unknown>): boolean {
    return Boolean(this.evaluate(expression, context))
  }

  validate(expression: string): { valid: boolean; error?: string } {
    if (!expression?.trim()) return { valid: true }
    try {
      const tokens = tokenizer.tokenize(expression)
      parser.parse(tokens)
      return { valid: true }
    } catch (err) {
      return { valid: false, error: err instanceof Error ? err.message : 'Invalid expression' }
    }
  }
}
