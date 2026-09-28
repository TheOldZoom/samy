import { Button } from "@/ui/components";
import { resolveValue } from "../../../common/value/resolveValue";
import type { ButtonNode } from "../../ast/nodes/ButtonNode";
import type { Cv2NodeRenderer } from "./types";

export const buttonRenderer: Cv2NodeRenderer<ButtonNode> = {
  kind: "button",
  render(node, context) {
    return Button({
      label: resolveValue(node.label, context.variables, context.resolver),
      url: resolveValue(node.url, context.variables, context.resolver).trim(),
      disabled: node.disabled,
    });
  },
};
