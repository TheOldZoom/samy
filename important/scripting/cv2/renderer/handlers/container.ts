import {
  ActionRowBuilder,
  ButtonBuilder,
  MediaGalleryBuilder,
  SectionBuilder,
  SeparatorBuilder,
  TextDisplayBuilder,
} from "discord.js";
import { Container } from "@/ui/components";
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
        container.addActionRowComponents(
          new ActionRowBuilder<ButtonBuilder>().addComponents(slice),
        );
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
        if (item instanceof TextDisplayBuilder) {
          container.addTextDisplayComponents(item);
        } else if (item instanceof SectionBuilder) {
          container.addSectionComponents(item);
        } else if (item instanceof SeparatorBuilder) {
          container.addSeparatorComponents(item);
        } else if (item instanceof MediaGalleryBuilder) {
          container.addMediaGalleryComponents(item);
        } else if (item instanceof ActionRowBuilder) {
          container.addActionRowComponents(item);
        }
      }
    }

    flushButtons();
    return container;
  },
};
