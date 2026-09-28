import type { ScriptValue } from "../../../common/value/ValueNode";
import { resolveValue } from "../../../common/value/resolveValue";
import { ScriptError } from "../../../common/ScriptError";
import type { EmbedNode } from "../EmbedNode";
import type { EmbedParameterDefinition } from "../../types/ParameterDefinition";
import { requireArgCount, requireNonEmpty } from "../../types/argHelpers";

export const MESSAGE_CONTENT_LIMIT = 2000;

export interface ContentNode extends EmbedNode {
  readonly kind: "content";
  readonly value: ScriptValue;
}

export const contentParameter: EmbedParameterDefinition<ContentNode> = {
  name: "content",

  create(token, args) {
    requireArgCount("content", args, 1, 1, token);
    requireNonEmpty("content", args[0]!, token, "content");
    return { kind: "content", token, value: args[0]! };
  },

  validate(node, context) {
    const text = resolveValue(node.value);
    if (text.length > MESSAGE_CONTENT_LIMIT) {
      context.addError(
        new ScriptError(
          "LIMIT_EXCEEDED",
          `Message content cannot exceed ${MESSAGE_CONTENT_LIMIT} characters (got ${text.length}).`,
          node.token,
        ),
      );
    }
  },

  render(node, target, context) {
    const text = resolveValue(node.value, context.variables, context.resolver);
    target.content = target.content ? `${target.content}\n${text}` : text;
  },
};
