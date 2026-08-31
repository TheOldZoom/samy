import { Container, Section, Separator, Text } from "@/ui/components";

import { icons } from "@/utils/icons";
import type { LogCategoryKey } from "@/commands/shared/logs";

const CATEGORY_ACCENTS: Record<LogCategoryKey, number> = {
  channels: 0x5865f2,
  guild: 0xfee75c,
  images: 0xeb459e,
  members: 0x57f287,
  messages: 0xed4245,
  moderation: 0xe67e22,
  roles: 0x9b59b6,
  voice: 0x1abc9c,
};

export interface LogField {
  name: string;
  value: string;
}

export interface LogEntryOptions {
  category: LogCategoryKey;
  title: string;
  description?: string;
  thumbnail?: string;
  fields?: LogField[];
  footer?: string;
}

export function buildLogEntry(options: LogEntryOptions): Container {
  const container = new Container(CATEGORY_ACCENTS[options.category]);

  if (options.thumbnail) {
    container.section(
      Section({
        title: options.title,
        description: options.description,
        thumbnail: options.thumbnail,
      }),
    );
  } else {
    container.text(Text(`${icons.list} ## ${options.title}`));

    if (options.description) {
      container.text(Text(options.description));
    }
  }

  if (options.fields && options.fields.length > 0) {
    container.separator(Separator());

    for (const field of options.fields) {
      container.text(Text(`**${field.name}**\n${field.value}`));
    }
  }

  if (options.footer) {
    container.separator(Separator());
    container.text(Text(`-# ${options.footer}`));
  }

  return container;
}
