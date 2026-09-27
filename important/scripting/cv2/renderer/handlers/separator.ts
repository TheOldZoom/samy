import { Separator } from "@/ui/components";
import type { SeparatorNode } from "../../ast/nodes/SeparatorNode";
import { resolveSeparatorSpacing } from "../../ast/nodes/SeparatorNode";
import type { Cv2NodeRenderer } from "./types";

export const separatorRenderer: Cv2NodeRenderer<SeparatorNode> = {
  kind: "separator",
  render(node) {
    return Separator(resolveSeparatorSpacing(node.spacing), node.divider);
  },
};
