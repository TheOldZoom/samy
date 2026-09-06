import { MessageFlags, type Message, type User } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand } from "@/classes/Command";
import { Container, Text } from "@/ui/components";
import type Client from "@/classes/client";
import { deliverPunishmentDm, sendPunishmentResponse } from "@/utils/invoke";
import { createModerationCase } from "@/utils/moderationCase";

async function executeSoftban({
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
          Text(icons.ban + " " + client.i18n.t("commands.softban.guild_only")),
        ),
      ],
    });

    return;
  }

  const member = message.guild.members.cache.get(target.id);

  if (target.id === message.author.id) {
    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(icons.ban + " " + client.i18n.t("commands.softban.self")),
        ),
      ],
    });

    return;
  }

  if (target.id === client.user?.id) {
    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(icons.ban + " " + client.i18n.t("commands.softban.bot")),
        ),
      ],
    });

    return;
  }

  if (member) {
    if (!member.bannable) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.ban + " " + client.i18n.t("commands.softban.not_bannable"),
            ),
          ),
        ],
      });

      return;
    }

    const authorMember = message.member;
    if (
      authorMember &&
      authorMember.roles.highest.position <= member.roles.highest.position &&
      message.guild.ownerId !== message.author.id
    ) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.ban +
                " " +
                client.i18n.t("commands.softban.role_hierarchy"),
            ),
          ),
        ],
      });

      return;
    }
  }

  const caseNumber = await createModerationCase({
    guildId: message.guild.id,
    type: "softban",
    userId: target.id,
    moderatorId: message.author.id,
    reason,
  });

  await deliverPunishmentDm({
    guild: message.guild,
    target,
    action: "softban",
    moderator: message.author,
    reason,
    caseNumber,
  });

  try {
    await message.guild.members.ban(target, {
      reason: `${message.author.tag}: ${reason}`,
      deleteMessageSeconds: 7 * 24 * 60 * 60,
    });
    await message.guild.members.unban(
      target,
      `Softban by ${message.author.tag}`,
    );
  } catch {
    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(icons.ban + " " + client.i18n.t("commands.softban.failed")),
        ),
      ],
    });

    return;
  }

  await sendPunishmentResponse({
    message,
    target,
    action: "softban",
    moderator: message.author,
    reason,
    caseNumber,
    fallback: async () => {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.ban +
                " " +
                client.i18n.t("commands.softban.success", {
                  user: target.tag,
                  reason,
                }),
            ),
          ),
        ],
      });
    },
  });
}

export default new MessageCommand({
  name: "softban",
  description: "Ban and immediately unban a user, deleting their messages.",
  aliases: ["sb"],
  category: "Moderation",
  guildOnly: true,
  userPermissions: ["BanMembers"],
  botPermissions: ["BanMembers"],

  arguments: [
    {
      name: "user",
      aliases: ["u", "member", "target"],
      type: "user",
      description: "The user to softban.",
      required: true,
    },
    {
      name: "reason",
      aliases: ["r"],
      type: "string",
      description: "Reason for the softban.",
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
              icons.ban +
                " " +
                client.i18n.t("commands.softban.user_not_found"),
            ),
          ),
        ],
      });

      return;
    }

    await executeSoftban({
      client,
      message,
      target,
      reason: args.getString("reason") ?? "No reason provided.",
    });
  },
});
