import type {
  Cv2Node,
  Cv2RenderContext,
} from "../../types/ComponentDefinition";
import type { Cv2Renderable } from "../../types/ComponentDefinition";

export interface Cv2NodeRenderer<T extends Cv2Node = Cv2Node> {
  readonly kind: string;
  render(node: T, context: Cv2RenderContext): Cv2Renderable | Cv2Renderable[];
}
