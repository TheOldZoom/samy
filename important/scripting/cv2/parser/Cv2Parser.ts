import { TokenKind } from "../../common/Token";
import { Tokenizer } from "../../common/Tokenizer";
import { ScriptError } from "../../common/ScriptError";
import { parseArgumentList, TokenCursor } from "../../common/value/parseValue";
import type { Cv2Node, Cv2Script } from "../types/ComponentDefinition";
import { getCv2Component } from "../registry";
import type { ContainerNode } from "../ast/nodes/ContainerNode";
import type { SectionNode } from "../ast/nodes/SectionNode";
import { buildCv2Tree } from "./buildTree";

export class Cv2Parser {
  parse(source: string): Cv2Script {
    const trimmed = source.trim();
    if (trimmed.length === 0) {
      throw new ScriptError("EMPTY_SCRIPT", "Components V2 script is empty.");
    }

    const tokens = new Tokenizer(trimmed).tokenize();
    const cursor = new TokenCursor(tokens);
    const flat: Cv2Node[] = [];

    cursor.skipWhitespaceText();

    while (!cursor.isAtEnd()) {
      flat.push(this.parseComponent(cursor));
      cursor.skipWhitespaceText();

      if (cursor.isAtEnd()) break;

      if (cursor.check(TokenKind.Sibling)) {
        cursor.advance();
        cursor.skipWhitespaceText();
        if (cursor.isAtEnd()) break;
        continue;
      }

      throw new ScriptError(
        "SYNTAX",
        "Expected $v between components.",
        cursor.current,
      );
    }

    if (flat.length === 0) {
      throw new ScriptError(
        "EMPTY_SCRIPT",
        "Components V2 script has no components.",
      );
    }

    const roots = buildCv2Tree(flat);

    return {
      type: "cv2",
      flat,
      roots,
    };
  }

  private parseComponent(cursor: TokenCursor): Cv2Node {
    const open = cursor.expect(
      TokenKind.LBrace,
      "Expected { to start a component.",
    );

    cursor.skipWhitespaceText();

    if (!cursor.check(TokenKind.Text)) {
      throw new ScriptError(
        "SYNTAX",
        "Expected a component name after {.",
        cursor.current,
      );
    }

    const nameToken = cursor.advance();
    const rawName = nameToken.value.trim();
    const nameMatch = rawName.match(
      /^([A-Za-z_][A-Za-z0-9_]*)(?:\s+([\s\S]+))?$/,
    );

    if (!nameMatch) {
      throw new ScriptError(
        "SYNTAX",
        `Invalid component name "${rawName}".`,
        nameToken,
      );
    }

    const name = nameMatch[1]!;
    const trailing = nameMatch[2];

    if (trailing !== undefined) {
      throw new ScriptError(
        "SYNTAX",
        `Unexpected text after component name "${name}". Did you mean {${name}: ${trailing}}?`,
        nameToken,
      );
    }

    if (name.length === 0) {
      throw new ScriptError("SYNTAX", "Component name cannot be empty.", open);
    }

    cursor.skipWhitespaceText();

    let args: ReturnType<typeof parseArgumentList> = [];
    if (cursor.check(TokenKind.Colon)) {
      cursor.advance();
      args = parseArgumentList(cursor);
    } else if (!cursor.check(TokenKind.RBrace)) {
      throw new ScriptError(
        "SYNTAX",
        `Expected : or } after component name "${name}".`,
        cursor.current,
      );
    }

    cursor.expect(TokenKind.RBrace, `Expected } to close {${name}}.`);

    const definition = getCv2Component(name);
    if (!definition) {
      throw new ScriptError(
        "UNKNOWN_COMPONENT",
        `Unknown component "${name}".`,
        nameToken,
      );
    }

    return definition.create(nameToken, args);
  }
}

export function parseCv2Script(source: string): Cv2Script {
  return new Cv2Parser().parse(source);
}

export type { ContainerNode, SectionNode };
