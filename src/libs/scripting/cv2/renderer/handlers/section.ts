import { ButtonBuilder, ComponentType } from "discord.js";
import { SectionComponent } from "@/utils/ui/components";
import type { SectionNode } from "../../ast/nodes/SectionNode";
import type { Cv2NodeRenderer } from "./types";
import type { Cv2RenderContext } from "../../types/ComponentDefinition";
import { renderCv2Child } from "../renderChild";

export const sectionRenderer: Cv2NodeRenderer<SectionNode> = {
  kind: "section",
  render(node, context) {
    const section = new SectionComponent();

    for (const textNode of node.texts) {
      const rendered = renderCv2Child(textNode, context);
      const items = Array.isArray(rendered) ? rendered : [rendered];
      for (const item of items) {
        if (item?.toJSON().type === ComponentType.TextDisplay) {
          section.addTextDisplayComponents(item as never);
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
  section: SectionComponent,
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

  if (item?.toJSON().type === ComponentType.Thumbnail) {
    section.setThumbnailAccessory(item as never);
  }
}
