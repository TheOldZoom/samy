import { escapeMarkdown, Events } from "discord.js";

import Event from "@/classes/Event";
import { getAfkStatus, removeAfkStatus } from "@/utils/afk";
import { icons } from "@/utils/icons";
import { Container, Text, v2 } from "@/utils/ui/components";

export default new Event({
  name: Events.MessageCreate,
  async execute(_client, message) {
    if (message.author.bot || !message.guildId) return;

    const lines: string[] = [];
    const authorStatus = getAfkStatus(message.guildId, message.author.id);
    if (
      authorStatus &&
      (await removeAfkStatus(message.guildId, message.author.id))
    ) {
      lines.push(`Welcome back! Your AFK status was removed.`);
    }

    for (const user of message.mentions.users.values()) {
      if (user.id === message.author.id || user.bot) continue;
      const status = getAfkStatus(message.guildId, user.id);
      if (!status) continue;

      const since = Math.floor(status.since.getTime() / 1_000);
      lines.push(
        `<@${user.id}> is AFK${status.reason ? ` · ${escapeMarkdown(status.reason)}` : ""} · <t:${since}:R>`,
      );
    }

    if (!lines.length) return;
    await message.reply({
      ...v2(
        new Container().text(
          Text(`-# ${icons.busy} · AFK`),
          Text(lines.join("\n")),
        ),
      ),
      allowedMentions: { parse: [], repliedUser: false },
    });
  },
});
