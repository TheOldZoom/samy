import {
  ActionRowBuilder,
  type APIActionRowComponent,
  type APIButtonComponent,
  type APIStringSelectComponent,
  type ButtonBuilder,
  type StringSelectMenuBuilder,
} from "discord.js";

type RowComponent = ButtonBuilder | StringSelectMenuBuilder;
export type ActionRowComponent = {
  toJSON(): APIActionRowComponent<
    APIButtonComponent | APIStringSelectComponent
  >;
};

export function ActionRow(...components: RowComponent[]) {
  return new ActionRowBuilder<RowComponent>()
    .addComponents(...components)
    .toJSON() as APIActionRowComponent<
    APIButtonComponent | APIStringSelectComponent
  >;
}
