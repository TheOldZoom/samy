import { Thumbnail } from "@/ui/components";
import { resolveValue } from "../../../common/value/resolveValue";
import type { ThumbnailNode } from "../../ast/nodes/ThumbnailNode";
import type { Cv2NodeRenderer } from "./types";

export const thumbnailRenderer: Cv2NodeRenderer<ThumbnailNode> = {
  kind: "thumbnail",
  render(node, context) {
    return Thumbnail(
      resolveValue(node.value, context.variables, context.resolver).trim(),
    );
  },
};
