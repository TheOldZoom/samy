import type { ScriptValue } from "../../../common/value/ValueNode";
import { resolveValue } from "../../../common/value/resolveValue";
import { ScriptError } from "../../../common/ScriptError";
import { EMBED_LIMITS } from "../../../common/limits";
import type { EmbedNode } from "../EmbedNode";
import type { EmbedParameterDefinition } from "../../types/ParameterDefinition";
import { requireArgCount, requireNonEmpty } from "../../types/argHelpers";

export interface DescriptionNode extends EmbedNode {
  readonly kind: "description";
  readonly value: ScriptValue;
}

export const descriptionParameter: EmbedParameterDefinition<DescriptionNode> = {
  name: "description",

  create(token, args) {
    requireArgCount("description", args, 1, 1, token);
    requireNonEmpty("description", args[0]!, token, "description");
    return { kind: "description", token, value: args[0]! };
  },

  validate(node, context) {
    const text = resolveValue(node.value);
    if (text.length > EMBED_LIMITS.description) {
      context.addError(
        new ScriptError(
          "LIMIT_EXCEEDED",
          `Embed description cannot exceed ${EMBED_LIMITS.description} characters (got ${text.length}).`,
          node.token,
        ),
      );
    }
  },

  render(node, target, context) {
    target.embed.setDescription(
      resolveValue(node.value, context.variables, context.resolver),
    );
  },
};
