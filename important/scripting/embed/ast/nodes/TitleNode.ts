import type { ScriptValue } from "../../../common/value/ValueNode";
import { resolveValue } from "../../../common/value/resolveValue";
import { ScriptError } from "../../../common/ScriptError";
import { EMBED_LIMITS } from "../../../common/limits";
import type { EmbedNode } from "../EmbedNode";
import type { EmbedParameterDefinition } from "../../types/ParameterDefinition";
import { requireArgCount, requireNonEmpty } from "../../types/argHelpers";

export interface TitleNode extends EmbedNode {
  readonly kind: "title";
  readonly value: ScriptValue;
}

export const titleParameter: EmbedParameterDefinition<TitleNode> = {
  name: "title",

  create(token, args) {
    requireArgCount("title", args, 1, 1, token);
    requireNonEmpty("title", args[0]!, token, "title");
    return { kind: "title", token, value: args[0]! };
  },

  validate(node, context) {
    const text = resolveValue(node.value);
    if (text.length > EMBED_LIMITS.title) {
      context.addError(
        new ScriptError(
          "LIMIT_EXCEEDED",
          `Embed title cannot exceed ${EMBED_LIMITS.title} characters (got ${text.length}).`,
          node.token,
        ),
      );
    }
  },

  render(node, target, context) {
    target.embed.setTitle(
      resolveValue(node.value, context.variables, context.resolver),
    );
  },
};
