import { TokenKind, type Token } from "../common/Token";
import { textValue } from "../common/value/ValueNode";
import type { Cv2Script } from "./types/ComponentDefinition";
import type { ContainerNode } from "./ast/nodes/ContainerNode";
import type { TextNode } from "./ast/nodes/TextNode";

const SYNTHETIC_TOKEN: Token = {
  kind: TokenKind.Text,
  value: "",
  offset: 0,
  line: 1,
  column: 1,
};

export function prependCv2Text(script: Cv2Script, content: string): void {
  const trimmed = content.trim();
  if (!trimmed) return;

  const textNode: TextNode = {
    kind: "text",
    token: SYNTHETIC_TOKEN,
    value: textValue(trimmed),
  };

  const first = script.roots[0];
  if (first?.kind === "container") {
    (first as ContainerNode).children.unshift(textNode);
    return;
  }

  script.roots.unshift(textNode);
}
