import { TextDisplayBuilder } from "@discordjs/builders";

export function Text(content: string) {
  return new TextDisplayBuilder().setContent(content);
}
