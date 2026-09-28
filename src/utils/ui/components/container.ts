import {
  ContainerBuilder,
  type ActionRowBuilder,
  type ButtonBuilder,
  type FileBuilder,
  type MediaGalleryBuilder,
  type SectionBuilder,
  type SeparatorBuilder,
  type StringSelectMenuBuilder,
  type TextDisplayBuilder,
} from "@discordjs/builders";

const DEFAULT_ACCENT_COLOR = 0x7946ff;

export class Container extends ContainerBuilder {
  constructor(accentColor: number | null = DEFAULT_ACCENT_COLOR) {
    super();

    if (accentColor !== null) {
      this.setAccentColor(accentColor);
    }
  }

  text(...components: TextDisplayBuilder[]) {
    this.addTextDisplayComponents(...components);
    return this;
  }

  section(...components: SectionBuilder[]) {
    this.addSectionComponents(...components);
    return this;
  }

  separator(...components: SeparatorBuilder[]) {
    this.addSeparatorComponents(...components);
    return this;
  }

  media(...components: MediaGalleryBuilder[]) {
    this.addMediaGalleryComponents(...components);
    return this;
  }

  file(...components: FileBuilder[]) {
    this.addFileComponents(...components);
    return this;
  }

  actionRow(
    ...components: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[]
  ) {
    this.addActionRowComponents(...components);
    return this;
  }
}
