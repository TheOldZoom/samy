import type { ScriptValue } from "../../../common/value/ValueNode";
import { resolveValue } from "../../../common/value/resolveValue";
import { ScriptError } from "../../../common/ScriptError";
import type { Cv2Node } from "../../types/ComponentDefinition";
import type { Cv2ComponentDefinition } from "../../types/ComponentDefinition";
import { requireArgCount } from "../../types/argHelpers";
import { parseColor } from "../../../common/parseHelpers";

export interface ContainerNode extends Cv2Node {
  readonly kind: "container";
  readonly accent?: ScriptValue;
  children: Cv2Node[];
}

export const containerComponent: Cv2ComponentDefinition<ContainerNode> = {
  name: "container",
  structural: true,

  create(token, args) {
    requireArgCount("container", args, 0, 1, token);
    return {
      kind: "container",
      token,
      accent: args[0],
      children: [],
    };
  },

  validate(node, context) {
    if (node.accent) {
      const raw = resolveValue(node.accent).trim();
      if (raw.length > 0 && parseColor(raw) === undefined) {
        context.addError(
          new ScriptError(
            "INVALID_VALUE",
            `Invalid container accent color "${raw}". Use #RRGGBB or a decimal color value.`,
            node.token,
          ),
        );
      }
    }
  },
};
