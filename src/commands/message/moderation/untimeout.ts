import { MessageFlags, type Message, type User } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand } from "@/classes/Command";
import { Container, Text } from "@/ui/components";
import type Client from "@/classes/client";
import { deliverPunishmentDm, sendPunishmentResponse } from "@/utils/invoke";
import { createModerationCase } from "@/utils/moderationCase";

async function executeUntimeout({
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
            icons.timeout +
              " " +
              client.i18n.t("commands.untimeout.guild_only"),
          ),
        ),
      ],
    });

    return;
  }

  const member = message.guild.members.cache.get(target.id);

  if (!member) {
    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(
            icons.timeout +
              " " +
              client.i18n.t("commands.untimeout.not_in_guild"),
          ),
        ),
      ],
    });

    return;
  }

  if (!member.communicationDisabledUntil) {
    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(
            icons.timeout +
              " " +
              client.i18n.t("commands.untimeout.not_timed_out"),
          ),
        ),
      ],
    });

    return;
  }

  if (!member.moderatable) {
    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(
            icons.timeout +
              " " +
              client.i18n.t("commands.untimeout.not_moderatable"),
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
            icons.timeout +
              " " +
              client.i18n.t("commands.untimeout.role_hierarchy"),
          ),
        ),
      ],
    });

    return;
  }

  const caseNumber = await createModerationCase({
    guildId: message.guild.id,
    type: "untimeout",
    userId: target.id,
    moderatorId: message.author.id,
    reason,
  });

  await deliverPunishmentDm({
    guild: message.guild,
    target,
    action: "untimeout",
    moderator: message.author,
    reason,
    caseNumber,
  });

  try {
    await member.timeout(null, `${message.author.tag}: ${reason}`);
  } catch {
    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(
            icons.timeout + " " + client.i18n.t("commands.untimeout.failed"),
          ),
        ),
      ],
    });

    return;
  }

  await sendPunishmentResponse({
    message,
    target,
    action: "untimeout",
    moderator: message.author,
    reason,
    caseNumber,
    fallback: async () => {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.timeout +
                " " +
                client.i18n.t("commands.untimeout.success", {
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
  name: "untimeout",
  description: "Remove a user's timeout.",
  aliases: ["unmute", "uto"],
  category: "Moderation",
  guildOnly: true,
  userPermissions: ["ModerateMembers"],
  botPermissions: ["ModerateMembers"],

  arguments: [
    {
      name: "user",
      aliases: ["u", "member", "target"],
      type: "user",
      description: "The user to remove the timeout from.",
      required: true,
    },
    {
      name: "reason",
      aliases: ["r"],
      type: "string",
      description: "Reason for removing the timeout.",
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
              icons.timeout +
                " " +
                client.i18n.t("commands.untimeout.user_not_found"),
            ),
          ),
        ],
      });

      return;
    }

    await executeUntimeout({
      client,
      message,
      target,
      reason: args.getString("reason") ?? "No reason provided.",
    });
  },
});
