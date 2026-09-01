import type {
  Cv2Node,
  Cv2RenderContext,
  Cv2Renderable,
} from "../types/ComponentDefinition";
import type { Cv2NodeRenderer } from "./handlers/types";
import { textRenderer } from "./handlers/text";
import { separatorRenderer } from "./handlers/separator";
import { thumbnailRenderer } from "./handlers/thumbnail";
import { mediaRenderer } from "./handlers/media";
import { buttonRenderer } from "./handlers/button";
import { sectionRenderer } from "./handlers/section";
import { containerRenderer } from "./handlers/container";
import { deleteRenderer } from "./handlers/delete";

const renderers = new Map<string, Cv2NodeRenderer>([
  [textRenderer.kind, textRenderer],
  [separatorRenderer.kind, separatorRenderer],
  [thumbnailRenderer.kind, thumbnailRenderer],
  [mediaRenderer.kind, mediaRenderer],
  [buttonRenderer.kind, buttonRenderer],
  [sectionRenderer.kind, sectionRenderer],
  [containerRenderer.kind, containerRenderer],
  [deleteRenderer.kind, deleteRenderer],
]);

export function renderCv2Child(
  node: Cv2Node,
  context: Cv2RenderContext,
): Cv2Renderable | Cv2Renderable[] {
  const renderer = renderers.get(node.kind);
  if (!renderer) {
    throw new Error(`No CV2 renderer registered for "${node.kind}".`);
  }
  return renderer.render(node, context);
}

export function getCv2Renderer(kind: string): Cv2NodeRenderer | undefined {
  return renderers.get(kind);
}
