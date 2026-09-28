import type { ScriptValue } from "../../../common/value/ValueNode";
import { resolveValue } from "../../../common/value/resolveValue";
import { ScriptError } from "../../../common/ScriptError";
import { isHttpUrl } from "../../../common/parseHelpers";
import type { Cv2Node } from "../../types/ComponentDefinition";
import type { Cv2ComponentDefinition } from "../../types/ComponentDefinition";
import { requireArgCount, requireNonEmpty } from "../../types/argHelpers";

export interface ButtonNode extends Cv2Node {
  readonly kind: "button";
  readonly label: ScriptValue;
  readonly url: ScriptValue;
  readonly disabled: boolean;
}

export const buttonComponent: Cv2ComponentDefinition<ButtonNode> = {
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
};
