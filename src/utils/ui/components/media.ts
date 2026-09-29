import { ComponentType, type APIMediaGalleryComponent } from "discord.js";

export class MediaGallery {
  constructor(private readonly urls: string[]) {}

  toJSON(): APIMediaGalleryComponent {
    return {
      type: ComponentType.MediaGallery,
      items: this.urls.map((url) => ({
        media: {
          url,
        },
      })),
    };
  }
}

export function Media(...urls: string[]) {
  return new MediaGallery(urls);
}
