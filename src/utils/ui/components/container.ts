import {
  ComponentType,
  type APIActionRowComponent,
  type APIButtonComponent,
  type APIComponentInContainer,
  type APIContainerComponent,
  type APIStringSelectComponent,
  type ButtonBuilder,
  type StringSelectMenuBuilder,
} from "discord.js";

import type { ActionRowComponent } from "./actionRow";
import type { MediaGallery } from "./media";
import type { SectionComponent } from "./section";
import type { SeparatorComponent } from "./separator";
import type { TextDisplay } from "./text";

const DEFAULT_ACCENT_COLOR = 0x7946ff;

type ContainerChild =
  | TextDisplay
  | SectionComponent
  | SeparatorComponent
  | MediaGallery
  | ActionRowComponent;

export class Container {
  private readonly components: ContainerChild[] = [];

  constructor(
    private readonly accentColor: number | null = DEFAULT_ACCENT_COLOR,
  ) {}

  text(...components: TextDisplay[]) {
    this.components.push(...components);
    return this;
  }

  section(...components: SectionComponent[]) {
    this.components.push(...components);
    return this;
  }

  separator(...components: SeparatorComponent[]) {
    this.components.push(...components);
    return this;
  }

  media(...components: MediaGallery[]) {
    this.components.push(...components);
    return this;
  }

  actionRow(
    ...components: APIActionRowComponent<
      APIButtonComponent | APIStringSelectComponent
    >[]
  ) {
    this.components.push(
      ...components
        .filter((component) => component.components.length > 0)
        .map((component) => ({ toJSON: () => component })),
    );
    return this;
  }

  addTextDisplayComponents(...components: TextDisplay[]) {
    return this.text(...components);
  }

  addSectionComponents(...components: SectionComponent[]) {
    return this.section(...components);
  }

  addSeparatorComponents(...components: SeparatorComponent[]) {
    return this.separator(...components);
  }

  addMediaGalleryComponents(...components: MediaGallery[]) {
    return this.media(...components);
  }

  addActionRowComponents(
    ...components: APIActionRowComponent<
      APIButtonComponent | APIStringSelectComponent
    >[]
  ) {
    return this.actionRow(...components);
  }

  toJSON(): APIContainerComponent {
    return {
      type: ComponentType.Container,
      accent_color: this.accentColor,
      components: this.components.map(
        (component) => component.toJSON() as APIComponentInContainer,
      ),
    };
  }
}
