import {
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";

import { parseEmoji } from "./emoji";

interface SelectMenuOption {
  label: string;
  value: string;
  description?: string;
  emoji?: string;
  default?: boolean;
}

export function SelectMenu(options: {
  customId: string;
  placeholder?: string;
  minValues?: number;
  maxValues?: number;
  options: SelectMenuOption[];
}) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(options.customId)
    .setOptions(
      options.options.map((option) => {
        const built = new StringSelectMenuOptionBuilder()
          .setLabel(option.label)
          .setValue(option.value);

        if (option.description) built.setDescription(option.description);
        if (option.emoji) built.setEmoji(parseEmoji(option.emoji));
        if (option.default) built.setDefault(true);

        return built;
      }),
    );

  if (options.placeholder) menu.setPlaceholder(options.placeholder);
  if (options.minValues !== undefined) menu.setMinValues(options.minValues);
  if (options.maxValues !== undefined) menu.setMaxValues(options.maxValues);

  return menu;
}
