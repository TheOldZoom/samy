import { ThumbnailBuilder } from "discord.js";

export function Thumbnail(url: string) {
  return new ThumbnailBuilder({
    media: {
      url,
    },
  });
}
