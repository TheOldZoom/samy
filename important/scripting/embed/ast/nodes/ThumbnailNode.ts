import type { ScriptValue } from "../../../common/value/ValueNode";
import { resolveValue } from "../../../common/value/resolveValue";
import { ScriptError } from "../../../common/ScriptError";
import { isHttpUrl } from "../../../common/parseHelpers";
import type { EmbedNode } from "../EmbedNode";
import type { EmbedParameterDefinition } from "../../types/ParameterDefinition";
import { requireArgCount, requireNonEmpty } from "../../types/argHelpers";

export interface ThumbnailNode extends EmbedNode {
  readonly kind: "thumbnail";
  readonly value: ScriptValue;
}

export const thumbnailParameter: EmbedParameterDefinition<ThumbnailNode> = {
  name: "thumbnail",

  create(token, args) {
    requireArgCount("thumbnail", args, 1, 1, token);
    requireNonEmpty("thumbnail", args[0]!, token, "thumbnail url");
    return { kind: "thumbnail", token, value: args[0]! };
  },

  validate(node, context) {
    const raw = resolveValue(node.value).trim();
    if (!isHttpUrl(raw)) {
      context.addError(
        new ScriptError(
          "INVALID_VALUE",
          `Invalid thumbnail url "${raw}". Expected an http(s) URL.`,
          node.token,
        ),
      );
    }
  },

  render(node, target, context) {
    target.embed.setThumbnail(
      resolveValue(node.value, context.variables, context.resolver).trim(),
    );
  },
};
