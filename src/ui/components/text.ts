import { TextDisplayBuilder } from "discord.js";

export function Text(content: string) {
  return new TextDisplayBuilder().setContent(content);
}
