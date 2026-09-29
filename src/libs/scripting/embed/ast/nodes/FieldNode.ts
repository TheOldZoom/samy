import type { ScriptValue } from "../../../common/value/ValueNode";
import { resolveValue } from "../../../common/value/resolveValue";
import { ScriptError } from "../../../common/ScriptError";
import { EMBED_LIMITS } from "../../../common/limits";
import type { EmbedNode } from "../EmbedNode";
import type { EmbedParameterDefinition } from "../../types/ParameterDefinition";
import { requireArgCount, requireNonEmpty } from "../../types/argHelpers";

export interface FieldNode extends EmbedNode {
  readonly kind: "field";
  readonly name: ScriptValue;
  readonly value: ScriptValue;
  readonly inline: boolean;
}

export const fieldParameter: EmbedParameterDefinition<FieldNode> = {
  name: "field",

  create(token, args) {
    requireArgCount("field", args, 2, 3, token);
    requireNonEmpty("field", args[0]!, token, "field name");
    requireNonEmpty("field", args[1]!, token, "field value");

    let inline = false;
    if (args[2]) {
      const flag = resolveValue(args[2]).trim().toLowerCase();
      if (flag !== "inline") {
        throw new ScriptError(
          "INVALID_ARGUMENT",
          `Invalid field flag "${flag}". Use "inline" or omit the third argument.`,
          token,
        );
      }
      inline = true;
    }

    return {
      kind: "field",
      token,
      name: args[0]!,
      value: args[1]!,
      inline,
    };
  },

  validate(node, context) {
    context.fieldCount += 1;

    if (context.fieldCount > EMBED_LIMITS.fields) {
      context.addError(
        new ScriptError(
          "LIMIT_EXCEEDED",
          `Embeds can have at most ${EMBED_LIMITS.fields} fields.`,
          node.token,
        ),
      );
    }

    const name = resolveValue(node.name);
    const value = resolveValue(node.value);

    if (name.length > EMBED_LIMITS.fieldName) {
      context.addError(
        new ScriptError(
          "LIMIT_EXCEEDED",
          `Field name cannot exceed ${EMBED_LIMITS.fieldName} characters (got ${name.length}).`,
          node.token,
        ),
      );
    }

    if (value.length > EMBED_LIMITS.fieldValue) {
      context.addError(
        new ScriptError(
          "LIMIT_EXCEEDED",
          `Field value cannot exceed ${EMBED_LIMITS.fieldValue} characters (got ${value.length}).`,
          node.token,
        ),
      );
    }
  },

  render(node, target, context) {
    target.embed.addFields({
      name: resolveValue(node.name, context.variables, context.resolver),
      value: resolveValue(node.value, context.variables, context.resolver),
      inline: node.inline,
    });
  },
};
