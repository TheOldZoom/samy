import { SeparatorSpacingSize } from "discord.js";
import type { ScriptValue } from "../../../common/value/ValueNode";
import { resolveValue } from "../../../common/value/resolveValue";
import { ScriptError } from "../../../common/ScriptError";
import type { Cv2Node } from "../../types/ComponentDefinition";
import type { Cv2ComponentDefinition } from "../../types/ComponentDefinition";
import { requireArgCount } from "../../types/argHelpers";

export interface SeparatorNode extends Cv2Node {
  readonly kind: "separator";
  readonly spacing: ScriptValue | undefined;
  readonly divider: boolean;
}

export const separatorComponent: Cv2ComponentDefinition<SeparatorNode> = {
  name: "separator",

  create(token, args) {
    requireArgCount("separator", args, 0, 2, token);

    let divider = true;
    if (args[1]) {
      const flag = resolveValue(args[1]).trim().toLowerCase();
      if (flag === "hidden" || flag === "nodivider") {
        divider = false;
      } else if (flag !== "divider") {
        throw new ScriptError(
          "INVALID_ARGUMENT",
          `Invalid separator divider flag "${flag}". Use "divider" or "hidden".`,
          token,
        );
      }
    }

    return {
      kind: "separator",
      token,
      spacing: args[0],
      divider,
    };
  },

  validate(node, context) {
    if (!node.spacing) return;

    const raw = resolveValue(node.spacing).trim().toLowerCase();
    if (raw.length === 0) return;

    if (raw !== "small" && raw !== "large") {
      context.addError(
        new ScriptError(
          "INVALID_VALUE",
          `Invalid separator spacing "${raw}". Use "small" or "large".`,
          node.token,
        ),
      );
    }
  },
};

export function resolveSeparatorSpacing(
  value: ScriptValue | undefined,
): SeparatorSpacingSize {
  if (!value) return SeparatorSpacingSize.Small;
  const raw = resolveValue(value).trim().toLowerCase();
  if (raw === "large") return SeparatorSpacingSize.Large;
  return SeparatorSpacingSize.Small;
}
