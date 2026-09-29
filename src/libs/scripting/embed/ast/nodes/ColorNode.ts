import type { ScriptValue } from "../../../common/value/ValueNode";
import { resolveValue } from "../../../common/value/resolveValue";
import { ScriptError } from "../../../common/ScriptError";
import { parseColor } from "../../../common/parseHelpers";
import type { EmbedNode } from "../EmbedNode";
import type { EmbedParameterDefinition } from "../../types/ParameterDefinition";
import { requireArgCount, requireNonEmpty } from "../../types/argHelpers";

export interface ColorNode extends EmbedNode {
  readonly kind: "color";
  readonly value: ScriptValue;
}

export const colorParameter: EmbedParameterDefinition<ColorNode> = {
  name: "color",

  create(token, args) {
    requireArgCount("color", args, 1, 1, token);
    requireNonEmpty("color", args[0]!, token, "color");
    return { kind: "color", token, value: args[0]! };
  },

  validate(node, context) {
    const raw = resolveValue(node.value).trim();
    if (parseColor(raw) === undefined) {
      context.addError(
        new ScriptError(
          "INVALID_VALUE",
          `Invalid color "${raw}". Use #RRGGBB or a decimal color value.`,
          node.token,
        ),
      );
    }
  },

  render(node, target, context) {
    const raw = resolveValue(
      node.value,
      context.variables,
      context.resolver,
    ).trim();
    const color = parseColor(raw);
    if (color !== undefined) {
      target.embed.setColor(color);
    }
  },
};
