import { MessageFlags, type Message, type User } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand } from "@/classes/Command";
import { Container, Text } from "@/ui/components";
import type Client from "@/classes/client";
import { ensureGuild } from "@/utils/guild";
import { deliverPunishmentDm, sendPunishmentResponse } from "@/utils/invoke";
import { createModerationCase } from "@/utils/moderationCase";

async function executeWarn({
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
          Text(icons.warning + " " + client.i18n.t("commands.warn.guild_only")),
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
          Text(icons.warning + " " + client.i18n.t("commands.warn.self")),
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
          Text(icons.warning + " " + client.i18n.t("commands.warn.bot")),
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
          Text(
            icons.warning + " " + client.i18n.t("commands.warn.not_in_guild"),
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
            icons.warning + " " + client.i18n.t("commands.warn.role_hierarchy"),
          ),
        ),
      ],
    });

    return;
  }

  const guildId = message.guild.id;

  try {
    await ensureGuild(guildId);

    await client.prisma.warning.create({
      data: {
        guildId,
        userId: target.id,
        moderatorId: message.author.id,
        reason,
      },
    });

    const caseNumber = await createModerationCase({
      guildId,
      type: "warn",
      userId: target.id,
      moderatorId: message.author.id,
      reason,
    });

    await deliverPunishmentDm({
      guild: message.guild,
      target,
      action: "warn",
      moderator: message.author,
      reason,
      caseNumber,
      fallback: async () => {
        await target.send({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(
                icons.warning +
                  " " +
                  client.i18n.t("commands.warn.dm", {
                    guild: message.guild!.name,
                    reason,
                  }),
              ),
            ),
          ],
        });
      },
    });

    await sendPunishmentResponse({
      message,
      target,
      action: "warn",
      moderator: message.author,
      reason,
      caseNumber,
      fallback: async () => {
        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(
                icons.warning +
                  " " +
                  client.i18n.t("commands.warn.success", {
                    user: target.tag,
                    case: String(caseNumber),
                    reason,
                  }),
              ),
            ),
          ],
        });
      },
    });
  } catch {
    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(icons.warning + " " + client.i18n.t("commands.warn.failed")),
        ),
      ],
    });
  }
}

export default new MessageCommand({
  name: "warn",
  description: "Warn a user.",
  aliases: ["warning"],
  category: "Moderation",
  guildOnly: true,
  userPermissions: ["ModerateMembers"],

  arguments: [
    {
      name: "user",
      aliases: ["u", "member", "target"],
      type: "user",
      description: "The user to warn.",
      required: true,
    },
    {
      name: "reason",
      aliases: ["r"],
      type: "string",
      description: "Reason for the warning.",
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
              icons.warning +
                " " +
                client.i18n.t("commands.warn.user_not_found"),
            ),
          ),
        ],
      });

      return;
    }

    await executeWarn({
      client,
      message,
      target,
      reason: args.getString("reason") ?? "No reason provided.",
    });
  },
});
