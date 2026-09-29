import {
  ComponentType,
  type APIButtonComponent,
  type APISectionComponent,
  type ButtonBuilder,
} from "discord.js";

import { Text, type TextDisplay } from "./text";
import { Thumbnail, type ThumbnailComponent } from "./thumbnail";

type SectionAccessory = ButtonBuilder | ThumbnailComponent;

type SectionOptions = {
  title?: string;
  description?: string;
  thumbnail?: string;
  button?: ButtonBuilder;
};

export class SectionComponent {
  private readonly components: TextDisplay[] = [];
  private accessory?: SectionAccessory;

  addTextDisplayComponents(...components: TextDisplay[]) {
    this.components.push(...components);
    return this;
  }

  setThumbnailAccessory(accessory: ThumbnailComponent) {
    this.accessory = accessory;
    return this;
  }

  setButtonAccessory(accessory: ButtonBuilder) {
    this.accessory = accessory;
    return this;
  }

  toJSON(): APISectionComponent {
    return {
      type: ComponentType.Section,
      components: this.components.map((component) => component.toJSON()),
      accessory: this.accessory?.toJSON() as APISectionComponent["accessory"],
    };
  }
}

export function Section(options: SectionOptions) {
  const section = new SectionComponent();

  if (options.title)
    section.addTextDisplayComponents(Text(`## ${options.title}`));

  if (options.description)
    section.addTextDisplayComponents(Text(options.description));

  if (options.thumbnail)
    section.setThumbnailAccessory(Thumbnail(options.thumbnail));

  if (options.button) section.setButtonAccessory(options.button);

  return section;
}
