import type { ScriptValue } from "../../../common/value/ValueNode";
import { resolveValue } from "../../../common/value/resolveValue";
import { ScriptError } from "../../../common/ScriptError";
import { isHttpUrl } from "../../../common/parseHelpers";
import { CV2_LIMITS } from "../../../common/limits";
import type { Cv2Node } from "../../types/ComponentDefinition";
import type { Cv2ComponentDefinition } from "../../types/ComponentDefinition";
import { requireArgCount, requireNonEmpty } from "../../types/argHelpers";

export interface MediaNode extends Cv2Node {
  readonly kind: "media";
  readonly urls: ScriptValue[];
}

export const mediaComponent: Cv2ComponentDefinition<MediaNode> = {
  name: "media",
  aliases: ["gallery"],

  create(token, args) {
    requireArgCount("media", args, 1, CV2_LIMITS.galleryItems, token);
    for (const arg of args) {
      requireNonEmpty("media", arg, token, "media url");
    }
    return { kind: "media", token, urls: args };
  },

  validate(node, context) {
    if (node.urls.length > CV2_LIMITS.galleryItems) {
      context.addError(
        new ScriptError(
          "LIMIT_EXCEEDED",
          `A media gallery can contain at most ${CV2_LIMITS.galleryItems} items.`,
          node.token,
        ),
      );
    }

    for (const value of node.urls) {
      const raw = resolveValue(value).trim();
      if (!isHttpUrl(raw)) {
        context.addError(
          new ScriptError(
            "INVALID_VALUE",
            `Invalid media url "${raw}". Expected an http(s) URL.`,
            node.token,
          ),
        );
      }
    }
  },
};
