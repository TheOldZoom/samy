import { ButtonStyle } from "discord.js";
import { Container, Separator, Text, ActionRow, Button } from "@/ui/components";

import { icons } from "@/utils/icons";

export interface UrbanDefinition {
  definition: string;
  permalink: string;
  thumbs_up: number;
  thumbs_down: number;
  author: string;
  word: string;
  written_on: string;
  example: string;
}

export function UrbanResult(def: UrbanDefinition) {
  const linkifyUrban = (text: string) =>
    text.replace(
      /\[([^\]]+)\]/g,
      (_, word: string) =>
        `[${word}](https://urbandictionary.com/define.php?term=${encodeURIComponent(word)})`,
    );

  const definition = linkifyUrban(def.definition);
  const example = linkifyUrban(def.example);

  return new Container()
    .text(Text(`## ${def.word}`))
    .text(Text(definition))
    .separator(Separator())
    .text(
      Text(`${icons.book} **Example:**\n${example || "No example provided."}`),
    )
    .separator(Separator())
    .text(
      Text(
        `-# **Author:** ${def.author} • **Votes:** ${icons.upvote} ${def.thumbs_up} ${icons.downvote} ${def.thumbs_down} • **Defined on:** <t:${Math.floor(new Date(def.written_on).getTime() / 1000)}:d>`,
      ),
    );
}

export function buildUrbanView(
  definitions: UrbanDefinition[],
  page: number,
  query: string,
  userId: string,
) {
  const totalPages = definitions.length;
  const current = Math.min(Math.max(page, 0), totalPages - 1);
  const def = definitions[current]!;

  const container = UrbanResult(def);

  if (totalPages > 1) {
    container.actionRow(
      ActionRow(
        Button({
          emoji: icons.leftarrow,
          label: " ",
          customId: `urban::page::${current - 1}::${encodeURIComponent(query)}::${userId}`,
          style: ButtonStyle.Secondary,
          disabled: current === 0,
        }),
        Button({
          label: `Page ${current + 1}/${totalPages}`,
          customId: `urban::noop::${userId}`,
          style: ButtonStyle.Secondary,
          disabled: true,
        }),
        Button({
          emoji: icons.rightarrow,
          label: " ",
          customId: `urban::page::${current + 1}::${encodeURIComponent(query)}::${userId}`,
          style: ButtonStyle.Secondary,
          disabled: current >= totalPages - 1,
        }),
      ),
    );
  }

  return container;
}
