import type { ScriptValue } from "../../../common/value/ValueNode";
import { resolveValue } from "../../../common/value/resolveValue";
import { ScriptError } from "../../../common/ScriptError";
import { CV2_LIMITS } from "../../../common/limits";
import type { Cv2Node } from "../../types/ComponentDefinition";
import type { Cv2ComponentDefinition } from "../../types/ComponentDefinition";
import { requireArgCount, requireNonEmpty } from "../../types/argHelpers";

export interface TextNode extends Cv2Node {
  readonly kind: "text";
  readonly value: ScriptValue;
}

export const textComponent: Cv2ComponentDefinition<TextNode> = {
  name: "text",
  aliases: ["content"],

  create(token, args) {
    requireArgCount("text", args, 1, 1, token);
    requireNonEmpty("text", args[0]!, token, "text content");
    return { kind: "text", token, value: args[0]! };
  },

  validate(node, context) {
    const content = resolveValue(node.value);
    if (content.length > CV2_LIMITS.textContent) {
      context.addError(
        new ScriptError(
          "LIMIT_EXCEEDED",
          `Text content cannot exceed ${CV2_LIMITS.textContent} characters (got ${content.length}).`,
          node.token,
        ),
      );
    }
  },
};
