import { Text } from "@/ui/components";
import { resolveValue } from "../../../common/value/resolveValue";
import type { TextNode } from "../../ast/nodes/TextNode";
import type { Cv2NodeRenderer } from "./types";

export const textRenderer: Cv2NodeRenderer<TextNode> = {
  kind: "text",
  render(node, context) {
    return Text(resolveValue(node.value, context.variables, context.resolver));
  },
};
