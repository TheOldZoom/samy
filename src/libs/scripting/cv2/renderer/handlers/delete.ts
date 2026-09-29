import type { Cv2NodeRenderer } from "./types";
import type { DeleteNode } from "../../ast/nodes/DeleteNode";

export const deleteRenderer: Cv2NodeRenderer<DeleteNode> = {
  kind: "delete",

  render() {
    return [];
  },
};
