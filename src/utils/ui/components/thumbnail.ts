import { ThumbnailBuilder } from "@discordjs/builders";

export function Thumbnail(url: string) {
  return new ThumbnailBuilder().setURL(url);
}
