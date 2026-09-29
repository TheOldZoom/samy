import type { ScriptValue } from "../../../common/value/ValueNode";
import { resolveValue } from "../../../common/value/resolveValue";
import { ScriptError } from "../../../common/ScriptError";
import { EMBED_LIMITS } from "../../../common/limits";
import { isHttpUrl } from "../../../common/parseHelpers";
import type { EmbedNode } from "../EmbedNode";
import type { EmbedParameterDefinition } from "../../types/ParameterDefinition";
import { requireArgCount, requireNonEmpty } from "../../types/argHelpers";

export interface AuthorNode extends EmbedNode {
  readonly kind: "author";
  readonly name: ScriptValue;
  readonly icon?: ScriptValue;
  readonly url?: ScriptValue;
}

export const authorParameter: EmbedParameterDefinition<AuthorNode> = {
  name: "author",

  create(token, args) {
    requireArgCount("author", args, 1, 3, token);
    requireNonEmpty("author", args[0]!, token, "author name");
    return {
      kind: "author",
      token,
      name: args[0]!,
      icon: args[1],
      url: args[2],
    };
  },

  validate(node, context) {
    const name = resolveValue(node.name);
    if (name.length > EMBED_LIMITS.authorName) {
      context.addError(
        new ScriptError(
          "LIMIT_EXCEEDED",
          `Embed author name cannot exceed ${EMBED_LIMITS.authorName} characters (got ${name.length}).`,
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
            `Invalid author icon url "${icon}". Expected an http(s) URL.`,
            node.token,
          ),
        );
      }
    }

    if (node.url) {
      const url = resolveValue(node.url).trim();
      if (url.length > 0 && !isHttpUrl(url)) {
        context.addError(
          new ScriptError(
            "INVALID_VALUE",
            `Invalid author url "${url}". Expected an http(s) URL.`,
            node.token,
          ),
        );
      }
    }
  },

  render(node, target, context) {
    const name = resolveValue(node.name, context.variables, context.resolver);
    const iconURL = node.icon
      ? resolveValue(node.icon, context.variables, context.resolver).trim()
      : undefined;
    const url = node.url
      ? resolveValue(node.url, context.variables, context.resolver).trim()
      : undefined;

    target.embed.setAuthor({
      name,
      iconURL: iconURL || undefined,
      url: url || undefined,
    });
  },
};
