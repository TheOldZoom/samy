import { ButtonBuilder, ComponentType } from "discord.js";
import { ActionRow, Container } from "@/utils/ui/components";
import { resolveValue } from "../../../common/value/resolveValue";
import { parseColor } from "../../../common/parseHelpers";
import type { ContainerNode } from "../../ast/nodes/ContainerNode";
import type { Cv2NodeRenderer } from "./types";
import { renderCv2Child } from "../renderChild";
import { CV2_LIMITS } from "../../../common/limits";

export const containerRenderer: Cv2NodeRenderer<ContainerNode> = {
  kind: "container",
  render(node, context) {
    let accent: number | undefined;
    if (node.accent) {
      accent = parseColor(
        resolveValue(node.accent, context.variables, context.resolver).trim(),
      );
    }

    const container = new Container(accent);
    const pendingButtons: ButtonBuilder[] = [];

    const flushButtons = () => {
      while (pendingButtons.length > 0) {
        const slice = pendingButtons.splice(0, CV2_LIMITS.buttonsPerActionRow);
        container.addActionRowComponents(ActionRow(...slice));
      }
    };

    for (const child of node.children) {
      if (child.kind === "button") {
        const rendered = renderCv2Child(child, context);
        const button = Array.isArray(rendered) ? rendered[0] : rendered;
        if (button instanceof ButtonBuilder) {
          pendingButtons.push(button);
        }
        continue;
      }

      flushButtons();

      const rendered = renderCv2Child(child, context);
      const items = Array.isArray(rendered) ? rendered : [rendered];

      for (const item of items) {
        const json = item?.toJSON();

        if (json?.type === ComponentType.TextDisplay) {
          container.addTextDisplayComponents(item as never);
        } else if (json?.type === ComponentType.Section) {
          container.addSectionComponents(item as never);
        } else if (json?.type === ComponentType.Separator) {
          container.addSeparatorComponents(item as never);
        } else if (json?.type === ComponentType.MediaGallery) {
          container.addMediaGalleryComponents(item as never);
        } else if (json?.type === ComponentType.ActionRow) {
          container.addActionRowComponents(json);
        }
      }
    }

    flushButtons();
    return container;
  },
};
