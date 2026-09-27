import {
  SectionBuilder,
  TextDisplayBuilder,
  ButtonBuilder,
  ThumbnailBuilder,
} from "discord.js";
import type { SectionNode } from "../../ast/nodes/SectionNode";
import type { Cv2NodeRenderer } from "./types";
import type { Cv2RenderContext } from "../../types/ComponentDefinition";
import { renderCv2Child } from "../renderChild";

export const sectionRenderer: Cv2NodeRenderer<SectionNode> = {
  kind: "section",
  render(node, context) {
    const section = new SectionBuilder();

    for (const textNode of node.texts) {
      const rendered = renderCv2Child(textNode, context);
      const items = Array.isArray(rendered) ? rendered : [rendered];
      for (const item of items) {
        if (item instanceof TextDisplayBuilder) {
          section.addTextDisplayComponents(item);
        }
      }
    }

    if (node.accessory) {
      applyAccessory(section, node.accessory, context);
    }

    return section;
  },
};

function applyAccessory(
  section: SectionBuilder,
  accessory: SectionNode["accessory"],
  context: Cv2RenderContext,
): void {
  if (!accessory) return;

  const rendered = renderCv2Child(accessory, context);
  const item = Array.isArray(rendered) ? rendered[0] : rendered;

  if (item instanceof ButtonBuilder) {
    section.setButtonAccessory(item);
    return;
  }

  if (item instanceof ThumbnailBuilder) {
    section.setThumbnailAccessory(item);
  }
}
