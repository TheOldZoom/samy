import { ComponentType, type APITextDisplayComponent } from "discord.js";

export class TextDisplay {
  constructor(private readonly content: string) {}

  toJSON(): APITextDisplayComponent {
    return {
      type: ComponentType.TextDisplay,
      content: this.content,
    };
  }
}

export function Text(content: string) {
  return new TextDisplay(content);
}
