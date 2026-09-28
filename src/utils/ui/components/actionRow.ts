import {
  ActionRowBuilder,
  type ButtonBuilder,
  type StringSelectMenuBuilder,
} from "@discordjs/builders";

type RowComponent = ButtonBuilder | StringSelectMenuBuilder;

export function ActionRow(...components: RowComponent[]) {
  return new ActionRowBuilder<RowComponent>().addComponents(...components);
}
