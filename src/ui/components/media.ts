import { MediaGalleryBuilder, MediaGalleryItemBuilder } from "discord.js";

export function Media(...urls: string[]) {
  return new MediaGalleryBuilder().addItems(
    ...urls.map((url) => new MediaGalleryItemBuilder().setURL(url)),
  );
}
