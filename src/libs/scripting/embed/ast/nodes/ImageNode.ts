import type { ScriptValue } from "../../../common/value/ValueNode";
import { resolveValue } from "../../../common/value/resolveValue";
import { ScriptError } from "../../../common/ScriptError";
import { isHttpUrl } from "../../../common/parseHelpers";
import type { EmbedNode } from "../EmbedNode";
import type { EmbedParameterDefinition } from "../../types/ParameterDefinition";
import { requireArgCount, requireNonEmpty } from "../../types/argHelpers";

export interface ImageNode extends EmbedNode {
  readonly kind: "image";
  readonly value: ScriptValue;
}

export const imageParameter: EmbedParameterDefinition<ImageNode> = {
  name: "image",

  create(token, args) {
    requireArgCount("image", args, 1, 1, token);
    requireNonEmpty("image", args[0]!, token, "image url");
    return { kind: "image", token, value: args[0]! };
  },

  validate(node, context) {
    const raw = resolveValue(node.value).trim();
    if (!isHttpUrl(raw)) {
      context.addError(
        new ScriptError(
          "INVALID_VALUE",
          `Invalid image url "${raw}". Expected an http(s) URL.`,
          node.token,
        ),
      );
    }
  },

  render(node, target, context) {
    target.embed.setImage(
      resolveValue(node.value, context.variables, context.resolver).trim(),
    );
  },
};
