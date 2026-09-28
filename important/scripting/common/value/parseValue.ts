import { TokenKind, tokenLabel, type Token } from "../Token";
import { ScriptError } from "../ScriptError";
import { emptyValue, type ScriptValue, type ValuePart } from "./ValueNode";

const VARIABLE_SEGMENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

export class TokenCursor {
  private index = 0;

  constructor(private readonly tokens: Token[]) {}

  get current(): Token {
    return this.tokens[this.index] ?? this.eofToken();
  }

  peek(lookahead = 0): Token {
    return this.tokens[this.index + lookahead] ?? this.eofToken();
  }

  isAtEnd(): boolean {
    return this.current.kind === TokenKind.Eof;
  }

  check(...kinds: TokenKind[]): boolean {
    return kinds.includes(this.current.kind);
  }

  advance(): Token {
    const token = this.current;
    if (token.kind !== TokenKind.Eof) {
      this.index += 1;
    }
    return token;
  }

  expect(kind: TokenKind, message?: string): Token {
    if (this.current.kind !== kind) {
      throw new ScriptError(
        "SYNTAX",
        message ??
          `Expected ${tokenLabel(kind)}, found ${tokenLabel(this.current.kind)}.`,
        this.current,
      );
    }
    return this.advance();
  }

  skipWhitespaceText(): void {
    while (
      this.current.kind === TokenKind.Text &&
      this.current.value.trim() === ""
    ) {
      this.advance();
    }
  }

  private eofToken(): Token {
    const last = this.tokens[this.tokens.length - 1];
    return (
      last ?? {
        kind: TokenKind.Eof,
        value: "",
        offset: 0,
        line: 1,
        column: 1,
      }
    );
  }
}

export function parseArgumentList(cursor: TokenCursor): ScriptValue[] {
  const args: ScriptValue[] = [];
  let current = emptyValue();

  const pushCurrent = () => {
    args.push(trimScriptValue(current));
    current = emptyValue();
  };

  while (!cursor.isAtEnd() && !cursor.check(TokenKind.RBrace)) {
    const token = cursor.current;

    if (token.kind === TokenKind.ArgSep) {
      cursor.advance();
      pushCurrent();
      continue;
    }

    if (token.kind === TokenKind.LBrace) {
      current.parts.push(parseVariable(cursor));
      continue;
    }

    if (token.kind === TokenKind.Sibling) {
      throw new ScriptError(
        "SYNTAX",
        "Unexpected $v inside a parameter value. Close the parameter with } first.",
        token,
      );
    }

    if (token.kind === TokenKind.Text || token.kind === TokenKind.Colon) {
      current.parts.push({ type: "text", value: token.value });
      cursor.advance();
      continue;
    }

    throw new ScriptError(
      "SYNTAX",
      `Unexpected ${tokenLabel(token.kind)} inside parameter value.`,
      token,
    );
  }

  pushCurrent();

  if (args.length === 1 && isVisuallyEmpty(args[0]!)) {
    return [];
  }

  return args;
}

function parseVariable(cursor: TokenCursor): ValuePart {
  const open = cursor.expect(TokenKind.LBrace);

  if (!cursor.check(TokenKind.Text)) {
    throw new ScriptError(
      "SYNTAX",
      "Expected a variable name after {.",
      cursor.current,
    );
  }

  const raw = cursor.advance().value.trim();

  if (cursor.check(TokenKind.Colon)) {
    throw new ScriptError(
      "SYNTAX",
      "Nested parameters are not allowed inside values. Use variables like {user} or {guild.name}.",
      cursor.current,
    );
  }

  cursor.expect(TokenKind.RBrace, "Expected } to close variable.");

  const path = raw.split(".");
  if (
    path.length === 0 ||
    path.some((segment) => !VARIABLE_SEGMENT.test(segment))
  ) {
    throw new ScriptError(
      "SYNTAX",
      `Invalid variable "{${raw}}". Variables must look like {user} or {guild.name}.`,
      open,
    );
  }

  return { type: "variable", path };
}

function trimScriptValue(value: ScriptValue): ScriptValue {
  if (value.parts.length === 0) return emptyValue();

  const parts = value.parts.map((part) => ({ ...part }));

  const first = parts[0];
  if (first?.type === "text") {
    first.value = first.value.replace(/^\s+/, "");
  }

  const last = parts[parts.length - 1];
  if (last?.type === "text") {
    last.value = last.value.replace(/\s+$/, "");
  }

  return {
    parts: parts.filter(
      (part) => part.type === "variable" || part.value.length > 0,
    ),
  };
}

function isVisuallyEmpty(value: ScriptValue): boolean {
  return value.parts.every(
    (part) => part.type === "text" && part.value.trim().length === 0,
  );
}
