import { MessageFlags, type Message, type User } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand } from "@/classes/Command";
import { Container, Text } from "@/ui/components";
import type Client from "@/classes/client";
import { deliverPunishmentDm, sendPunishmentResponse } from "@/utils/invoke";
import { createModerationCase } from "@/utils/moderationCase";

async function executeKick({
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
          Text(icons.kick + " " + client.i18n.t("commands.kick.guild_only")),
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
          Text(icons.kick + " " + client.i18n.t("commands.kick.self")),
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
          Text(icons.kick + " " + client.i18n.t("commands.kick.bot")),
        ),
      ],
    });

    return;
  }

  if (!member) {
    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(icons.kick + " " + client.i18n.t("commands.kick.not_in_guild")),
        ),
      ],
    });

    return;
  }

  if (!member.kickable) {
    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(icons.kick + " " + client.i18n.t("commands.kick.not_kickable")),
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
            icons.kick + " " + client.i18n.t("commands.kick.role_hierarchy"),
          ),
        ),
      ],
    });

    return;
  }

  const caseNumber = await createModerationCase({
    guildId: message.guild.id,
    type: "kick",
    userId: target.id,
    moderatorId: message.author.id,
    reason,
  });

  await deliverPunishmentDm({
    guild: message.guild,
    target,
    action: "kick",
    moderator: message.author,
    reason,
    caseNumber,
  });

  try {
    await member.kick(`${message.author.tag}: ${reason}`);
  } catch {
    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(icons.kick + " " + client.i18n.t("commands.kick.failed")),
        ),
      ],
    });

    return;
  }

  await sendPunishmentResponse({
    message,
    target,
    action: "kick",
    moderator: message.author,
    reason,
    caseNumber,
    fallback: async () => {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.kick +
                " " +
                client.i18n.t("commands.kick.success", {
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
  name: "kick",
  description: "Kick a user.",
  aliases: ["k"],
  category: "Moderation",
  guildOnly: true,
  userPermissions: ["KickMembers"],
  botPermissions: ["KickMembers"],

  arguments: [
    {
      name: "user",
      aliases: ["u", "member", "target"],
      type: "user",
      description: "The user to kick.",
      required: true,
    },
    {
      name: "reason",
      aliases: ["r"],
      type: "string",
      description: "Reason for the kick.",
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
              icons.kick + " " + client.i18n.t("commands.kick.user_not_found"),
            ),
          ),
        ],
      });

      return;
    }

    await executeKick({
      client,
      message,
      target,
      reason: args.getString("reason") ?? "No reason provided.",
    });
  },
});
