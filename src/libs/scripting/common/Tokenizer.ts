import { TokenKind, type Token } from "./Token";
import { ScriptError } from "./ScriptError";

export class Tokenizer {
  private readonly source: string;
  private offset = 0;
  private line = 1;
  private column = 1;

  constructor(source: string) {
    this.source = source;
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];

    while (!this.isAtEnd()) {
      const start = this.snapshot();
      const char = this.peek();

      if (char === "{") {
        this.advance();
        tokens.push(this.makeToken(TokenKind.LBrace, "{", start));
        continue;
      }

      if (char === "}") {
        this.advance();
        tokens.push(this.makeToken(TokenKind.RBrace, "}", start));
        continue;
      }

      if (char === ":") {
        this.advance();
        tokens.push(this.makeToken(TokenKind.Colon, ":", start));
        continue;
      }

      if (char === "$" && this.peek(1) === "v") {
        this.advance();
        this.advance();
        tokens.push(this.makeToken(TokenKind.Sibling, "$v", start));
        continue;
      }

      if (char === "&" && this.peek(1) === "&") {
        this.advance();
        this.advance();
        tokens.push(this.makeToken(TokenKind.ArgSep, "&&", start));
        continue;
      }

      const text = this.readText();
      if (text.length > 0) {
        tokens.push(this.makeToken(TokenKind.Text, text, start));
      }
    }

    tokens.push(
      this.makeToken(TokenKind.Eof, "", {
        offset: this.offset,
        line: this.line,
        column: this.column,
      }),
    );

    return tokens;
  }

  private readText(): string {
    let value = "";

    while (!this.isAtEnd()) {
      const char = this.peek();

      if (
        char === "{" ||
        char === "}" ||
        char === ":" ||
        (char === "$" && this.peek(1) === "v") ||
        (char === "&" && this.peek(1) === "&")
      ) {
        break;
      }

      value += this.advance();
    }

    return value;
  }

  private peek(lookahead = 0): string {
    return this.source[this.offset + lookahead] ?? "";
  }

  private advance(): string {
    const char = this.source[this.offset] ?? "";
    this.offset += 1;

    if (char === "\n") {
      this.line += 1;
      this.column = 1;
    } else {
      this.column += 1;
    }

    return char;
  }

  private isAtEnd(): boolean {
    return this.offset >= this.source.length;
  }

  private snapshot() {
    return {
      offset: this.offset,
      line: this.line,
      column: this.column,
    };
  }

  private makeToken(
    kind: TokenKind,
    value: string,
    location: { offset: number; line: number; column: number },
  ): Token {
    return {
      kind,
      value,
      offset: location.offset,
      line: location.line,
      column: location.column,
    };
  }
}

export function assertHasTokens(tokens: Token[]): void {
  if (tokens.length === 0) {
    throw new ScriptError("SYNTAX", "Script produced no tokens.");
  }
}
