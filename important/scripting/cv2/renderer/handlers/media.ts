import { Media } from "@/ui/components";
import { resolveValue } from "../../../common/value/resolveValue";
import type { MediaNode } from "../../ast/nodes/MediaNode";
import type { Cv2NodeRenderer } from "./types";

export const mediaRenderer: Cv2NodeRenderer<MediaNode> = {
  kind: "media",
  render(node, context) {
    const urls = node.urls.map((value) =>
      resolveValue(value, context.variables, context.resolver).trim(),
    );
    return Media(...urls);
  },
};
