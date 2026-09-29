export enum TokenKind {
  LBrace = "LBrace",
  RBrace = "RBrace",
  Colon = "Colon",
  Sibling = "Sibling",
  ArgSep = "ArgSep",
  Text = "Text",
  Eof = "Eof",
}

export interface Token {
  kind: TokenKind;

  value: string;

  offset: number;

  line: number;

  column: number;
}

export function tokenLabel(kind: TokenKind): string {
  switch (kind) {
    case TokenKind.LBrace:
      return "{";
    case TokenKind.RBrace:
      return "}";
    case TokenKind.Colon:
      return ":";
    case TokenKind.Sibling:
      return "$v";
    case TokenKind.ArgSep:
      return "&&";
    case TokenKind.Text:
      return "text";
    case TokenKind.Eof:
      return "end of input";
  }
}
