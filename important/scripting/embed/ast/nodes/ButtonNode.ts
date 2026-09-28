import type { ScriptValue } from "../../../common/value/ValueNode";
import { resolveValue } from "../../../common/value/resolveValue";
import { ScriptError } from "../../../common/ScriptError";
import { EMBED_LIMITS } from "../../../common/limits";
import { isHttpUrl } from "../../../common/parseHelpers";
import type { EmbedNode } from "../EmbedNode";
import type { EmbedParameterDefinition } from "../../types/ParameterDefinition";
import { requireArgCount, requireNonEmpty } from "../../types/argHelpers";
import { Button } from "@/ui/components";

export interface ButtonNode extends EmbedNode {
  readonly kind: "button";
  readonly label: ScriptValue;
  readonly url: ScriptValue;
  readonly disabled: boolean;
}

export const buttonParameter: EmbedParameterDefinition<ButtonNode> = {
  name: "button",

  create(token, args) {
    requireArgCount("button", args, 2, 3, token);
    requireNonEmpty("button", args[0]!, token, "label");
    requireNonEmpty("button", args[1]!, token, "url");

    let disabled = false;
    if (args[2]) {
      const flag = resolveValue(args[2]).trim().toLowerCase();
      if (flag !== "disabled" && flag !== "enabled") {
        throw new ScriptError(
          "INVALID_ARGUMENT",
          `Invalid button state "${flag}". Use "disabled" or "enabled".`,
          token,
        );
      }
      disabled = flag === "disabled";
    }

    return {
      kind: "button",
      token,
      label: args[0]!,
      url: args[1]!,
      disabled,
    };
  },

  validate(node, context) {
    context.buttonCount += 1;

    if (context.buttonCount > EMBED_LIMITS.buttons) {
      context.addError(
        new ScriptError(
          "LIMIT_EXCEEDED",
          `Messages can have at most ${EMBED_LIMITS.buttons} buttons.`,
          node.token,
        ),
      );
    }

    const label = resolveValue(node.label);
    if (label.length === 0 || label.length > 80) {
      context.addError(
        new ScriptError(
          "LIMIT_EXCEEDED",
          "Button labels must be between 1 and 80 characters.",
          node.token,
        ),
      );
    }

    const url = resolveValue(node.url).trim();
    if (!isHttpUrl(url)) {
      context.addError(
        new ScriptError(
          "INVALID_VALUE",
          `Buttons only support URLs. "${url}" is not a valid http(s) URL.`,
          node.token,
        ),
      );
    }
  },

  render(node, target, context) {
    target.buttons.push(
      Button({
        label: resolveValue(node.label, context.variables, context.resolver),
        url: resolveValue(node.url, context.variables, context.resolver).trim(),
        disabled: node.disabled,
      }),
    );
  },
};
