import type { ScriptValue } from "../../../common/value/ValueNode";
import { resolveValue } from "../../../common/value/resolveValue";
import { ScriptError } from "../../../common/ScriptError";
import { isHttpUrl } from "../../../common/parseHelpers";
import type { EmbedNode } from "../EmbedNode";
import type { EmbedParameterDefinition } from "../../types/ParameterDefinition";
import { requireArgCount, requireNonEmpty } from "../../types/argHelpers";

export interface UrlNode extends EmbedNode {
  readonly kind: "url";
  readonly value: ScriptValue;
}

export const urlParameter: EmbedParameterDefinition<UrlNode> = {
  name: "url",

  create(token, args) {
    requireArgCount("url", args, 1, 1, token);
    requireNonEmpty("url", args[0]!, token, "url");
    return { kind: "url", token, value: args[0]! };
  },

  validate(node, context) {
    const raw = resolveValue(node.value).trim();
    if (!isHttpUrl(raw)) {
      context.addError(
        new ScriptError(
          "INVALID_VALUE",
          `Invalid embed url "${raw}". Expected an http(s) URL.`,
          node.token,
        ),
      );
    }
  },

  render(node, target, context) {
    target.embed.setURL(
      resolveValue(node.value, context.variables, context.resolver).trim(),
    );
  },
};
