import type {
  ActionRowBuilder,
  ButtonBuilder,
  ContainerBuilder,
  FileBuilder,
  MediaGalleryBuilder,
  SectionBuilder,
  SeparatorBuilder,
  StringSelectMenuBuilder,
  TextDisplayBuilder,
} from "@discordjs/builders";
import { MessageFlags } from "@discordjs/core";

type TopLevel =
  | ContainerBuilder
  | SectionBuilder
  | TextDisplayBuilder
  | MediaGalleryBuilder
  | FileBuilder
  | SeparatorBuilder
  | ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>;

export function v2(...components: TopLevel[]) {
  return {
    flags: MessageFlags.IsComponentsV2,
    components: components.map((component) => component.toJSON()),
  };
}
