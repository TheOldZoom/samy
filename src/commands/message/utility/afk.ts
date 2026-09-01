import { MessageFlags } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand } from "@/classes/Command";
import { Container, Text } from "@/ui/components";
import { ensureGuild, ensureUser } from "@/utils/guild";

export default new MessageCommand({
  name: "afk",
  aliases: [],
  description: "Set your AFK status with an optional reason.",
  arguments: [
    {
      name: "reason",
      type: "string",
      required: false,
      description: "The reason you're going AFK",
    },
  ],
  category: "Utility",
  async execute(client, message, args) {
    const guild = message.guild;

    if (!guild) return;

    const reason =
      args.getString("reason") || client.i18n.t("commands.afk.default_reason");

    if (reason.length > 256) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(icons.idle + " " + client.i18n.t("commands.afk.limit")),
          ),
        ],
      });
      return;
    }

    client.afkUsers.set(`${guild.id}:${message.author.id}`, {
      guildId: guild.id,
      userId: message.author.id,
      reason,
      createdAt: new Date(),
    });

    await ensureGuild(guild.id);
    await ensureUser(message.author.id);

    await client.prisma.afk.upsert({
      where: {
        userId_guildId: {
          userId: message.author.id,
          guildId: guild.id,
        },
      },
      create: {
        userId: message.author.id,
        guildId: guild.id,
        reason,
      },
      update: {
        reason,
        createdAt: new Date(),
      },
    });

    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: {
        parse: [],
      },
      components: [
        new Container().text(
          Text(
            icons.idle +
              " " +
              client.i18n.t("commands.afk.set", {
                reason,
              }),
          ),
        ),
      ],
    });
  },
});
