import { ComponentType, type APIThumbnailComponent } from "discord.js";

export class ThumbnailComponent {
  constructor(private readonly url: string) {}

  toJSON(): APIThumbnailComponent {
    return {
      type: ComponentType.Thumbnail,
      media: {
        url: this.url,
      },
    };
  }
}

export function Thumbnail(url: string) {
  return new ThumbnailComponent(url);
}
