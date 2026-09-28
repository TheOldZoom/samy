import {
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
} from "@discordjs/builders";

export function Media(...urls: string[]) {
  return new MediaGalleryBuilder().addItems(
    ...urls.map((url) => new MediaGalleryItemBuilder().setURL(url)),
  );
}
