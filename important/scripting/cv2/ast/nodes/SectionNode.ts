import { ScriptError } from "../../../common/ScriptError";
import { CV2_LIMITS } from "../../../common/limits";
import type { Cv2Node } from "../../types/ComponentDefinition";
import type { Cv2ComponentDefinition } from "../../types/ComponentDefinition";
import { requireArgCount } from "../../types/argHelpers";

export interface SectionNode extends Cv2Node {
  readonly kind: "section";
  texts: Cv2Node[];
  accessory?: Cv2Node;
}

export const sectionComponent: Cv2ComponentDefinition<SectionNode> = {
  name: "section",
  structural: true,

  create(token, args) {
    requireArgCount("section", args, 0, 0, token);
    return {
      kind: "section",
      token,
      texts: [],
      accessory: undefined,
    };
  },

  validate(node, context) {
    if (node.texts.length === 0) {
      context.addError(
        new ScriptError(
          "INVALID_NESTING",
          "A section must contain at least one {text: ...} component.",
          node.token,
        ),
      );
    }

    if (node.texts.length > CV2_LIMITS.sectionTextDisplays) {
      context.addError(
        new ScriptError(
          "LIMIT_EXCEEDED",
          `A section can contain at most ${CV2_LIMITS.sectionTextDisplays} text components.`,
          node.token,
        ),
      );
    }

    if (node.accessory) {
      const kind = node.accessory.kind;
      if (kind !== "button" && kind !== "thumbnail") {
        context.addError(
          new ScriptError(
            "INVALID_NESTING",
            `Section accessory cannot be {${kind}}. Use {button} or {thumbnail}.`,
            node.accessory.token,
          ),
        );
      }
    }
  },
};
