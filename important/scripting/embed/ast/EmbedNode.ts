import type { Token } from "../../common/Token";
import type { ScriptValue } from "../../common/value/ValueNode";

export interface EmbedNode {
  readonly kind: string;
  readonly token: Token;
}

export type AnyEmbedNode = EmbedNode;

export interface EmbedScript {
  readonly type: "embed";
  readonly nodes: AnyEmbedNode[];
}

export interface SingleValueNode extends EmbedNode {
  readonly value: ScriptValue;
}

export interface MultiValueNode extends EmbedNode {
  readonly args: ScriptValue[];
}
