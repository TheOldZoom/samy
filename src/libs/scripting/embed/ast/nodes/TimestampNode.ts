import type { EmbedNode } from "../EmbedNode";
import type { EmbedParameterDefinition } from "../../types/ParameterDefinition";
import { requireArgCount } from "../../types/argHelpers";

export interface TimestampNode extends EmbedNode {
  readonly kind: "timestamp";
}

export const timestampParameter: EmbedParameterDefinition<TimestampNode> = {
  name: "timestamp",

  create(token, args) {
    requireArgCount("timestamp", args, 0, 0, token);
    return { kind: "timestamp", token };
  },

  validate() {},

  render(_node, target) {
    target.embed.setTimestamp(Date.now());
  },
};
