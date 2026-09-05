import { MessageFlags, type Message, type User } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand } from "@/classes/Command";
import { Container, Text } from "@/ui/components";
import type Client from "@/classes/client";

async function executeUnban({
  message,
  client,
  target,
  reason,
}: {
  message: Message;
  client: Client;
  target: User;
  reason: string;
}): Promise<void> {
  if (!message.guild) {
    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(
            icons.unbanmember +
              " " +
              client.i18n.t("commands.unban.guild_only"),
          ),
        ),
      ],
    });

    return;
  }

  const guildId = message.guild.id;

  let discordBan;

  try {
    discordBan = await message.guild.bans.fetch(target.id);
  } catch {
    discordBan = null;
  }

  const guildBan = await client.prisma.guildBan.findUnique({
    where: {
      guildId_userId: {
        guildId,
        userId: target.id,
      },
    },
  });

  if (!discordBan && !guildBan) {
    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(
            icons.unbanmember +
              " " +
              client.i18n.t("commands.unban.not_banned", {
                user: target.tag,
              }),
          ),
        ),
      ],
    });

    return;
  }

  const auditReason = `${message.author.tag}: ${reason}`;

  if (discordBan) {
    try {
      await message.guild.members.unban(target.id, auditReason);
    } catch {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.unbanmember + " " + client.i18n.t("commands.unban.failed"),
            ),
          ),
        ],
      });

      return;
    }
  }

  if (guildBan) {
    try {
      await client.prisma.guildBan.delete({
        where: {
          guildId_userId: {
            guildId,
            userId: target.id,
          },
        },
      });
    } catch {}
  }

  try {
    await target.send({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(
            icons.unbanmember +
              " " +
              client.i18n.t("commands.unban.dm", {
                guild: message.guild.name,
                reason,
              }),
          ),
        ),
      ],
    });
  } catch {}

  await message.reply({
    flags: MessageFlags.IsComponentsV2,
    components: [
      new Container().text(
        Text(
          icons.unbanmember +
            " " +
            client.i18n.t("commands.unban.success", {
              user: target.tag,
              reason,
            }),
        ),
      ),
    ],
  });
}

export default new MessageCommand({
  name: "unban",
  description: "Unban a user.",
  aliases: ["ub"],
  category: "Moderation",
  guildOnly: true,
  userPermissions: ["BanMembers"],
  botPermissions: ["BanMembers"],

  arguments: [
    {
      name: "user",
      aliases: ["u", "member", "target"],
      type: "user",
      description: "The user to unban.",
      required: true,
    },
    {
      name: "reason",
      aliases: ["r"],
      type: "string",
      description: "The reason for the unban.",
      required: false,
      default: "No reason provided.",
    },
  ],

  async execute(client, message, args) {
    const target = args.getUser("user");

    if (!target) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.unbanmember +
                " " +
                client.i18n.t("commands.unban.user_not_found"),
            ),
          ),
        ],
      });

      return;
    }

    const reason = args.getString("reason") ?? "No reason provided.";

    await executeUnban({
      client,
      message,
      target,
      reason,
    });
  },
});
