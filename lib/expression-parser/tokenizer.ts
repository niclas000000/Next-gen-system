// TODO: Implement tokenizer
export type TokenType =
  | 'NUMBER'
  | 'STRING'
  | 'IDENTIFIER'
  | 'OPERATOR'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'EOF'

export interface Token {
  type: TokenType
  value: string
  position: number
}

export class Tokenizer {
  tokenize(_expression: string): Token[] {
    throw new Error('Not implemented')
  }
}
