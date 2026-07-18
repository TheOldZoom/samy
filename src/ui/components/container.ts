import {
  ContainerBuilder,
  FileBuilder,
  MediaGalleryBuilder,
  SectionBuilder,
  SeparatorBuilder,
  TextDisplayBuilder,
} from "discord.js";

export class Container extends ContainerBuilder {
  constructor(accentColor?: number) {
    super();

    if (accentColor) {
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
}
