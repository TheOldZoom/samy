import { Container, Section, Separator, Text } from "@/ui/components";
import type Client from "@/classes/client";

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

export function UrbanResult(client: Client, def: UrbanDefinition) {
  const definition = def.definition.replace(
    /\[(.*?)\]/g,
    "[$1](https://urbandictionary.com/define.php?term=$1)",
  );
  const example = def.example.replace(
    /\[(.*?)\]/g,
    "[$1](https://urbandictionary.com/define.php?term=$1)",
  );

  return new Container()
    .section(
      Section({
        title: def.word,
        description: definition,
      }),
    )
    .separator(Separator())
    .text(
      Text(`${icons.book} **Example:**\n${example || "No example provided."}`),
    )
    .separator(Separator())
    .text(
      Text(
        `**Author:** ${def.author}\n**Votes:** ${icons.upvote} ${def.thumbs_up} ${icons.downvote} ${def.thumbs_down}\n**Defined on:** <t:${Math.floor(new Date(def.written_on).getTime() / 1000)}:d>`,
      ),
    );
}
