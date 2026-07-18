import { ButtonBuilder, SectionBuilder } from "discord.js";

import { Text } from "./text";
import { Thumbnail } from "./thumbnail";

type SectionOptions = {
  title?: string;
  description?: string;
  thumbnail?: string;
  button?: ButtonBuilder;
};

export function Section(options: SectionOptions) {
  const section = new SectionBuilder();

  if (options.title)
    section.addTextDisplayComponents(Text(`## ${options.title}`));

  if (options.description)
    section.addTextDisplayComponents(Text(options.description));

  if (options.thumbnail)
    section.setThumbnailAccessory(Thumbnail(options.thumbnail));

  if (options.button) section.setButtonAccessory(options.button);

  return section;
}
