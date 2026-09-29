import type { ScriptValue } from "../../../common/value/ValueNode";
import { resolveValue } from "../../../common/value/resolveValue";
import { ScriptError } from "../../../common/ScriptError";
import { EMBED_LIMITS } from "../../../common/limits";
import { isHttpUrl } from "../../../common/parseHelpers";
import type { EmbedNode } from "../EmbedNode";
import type { EmbedParameterDefinition } from "../../types/ParameterDefinition";
import { requireArgCount, requireNonEmpty } from "../../types/argHelpers";

export interface FooterNode extends EmbedNode {
  readonly kind: "footer";
  readonly text: ScriptValue;
  readonly icon?: ScriptValue;
}

export const footerParameter: EmbedParameterDefinition<FooterNode> = {
  name: "footer",

  create(token, args) {
    requireArgCount("footer", args, 1, 2, token);
    requireNonEmpty("footer", args[0]!, token, "footer text");
    return {
      kind: "footer",
      token,
      text: args[0]!,
      icon: args[1],
    };
  },

  validate(node, context) {
    const text = resolveValue(node.text);
    if (text.length > EMBED_LIMITS.footerText) {
      context.addError(
        new ScriptError(
          "LIMIT_EXCEEDED",
          `Embed footer cannot exceed ${EMBED_LIMITS.footerText} characters (got ${text.length}).`,
          node.token,
        ),
      );
    }

    if (node.icon) {
      const icon = resolveValue(node.icon).trim();
      if (icon.length > 0 && !isHttpUrl(icon)) {
        context.addError(
          new ScriptError(
            "INVALID_VALUE",
            `Invalid footer icon url "${icon}". Expected an http(s) URL.`,
            node.token,
          ),
        );
      }
    }
  },

  render(node, target, context) {
    const text = resolveValue(node.text, context.variables, context.resolver);
    const iconURL = node.icon
      ? resolveValue(node.icon, context.variables, context.resolver).trim()
      : undefined;

    target.embed.setFooter({
      text,
      iconURL: iconURL || undefined,
    });
  },
};
