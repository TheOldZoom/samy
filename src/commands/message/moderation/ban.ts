import { MessageFlags, type Message, type User } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand } from "@/classes/Command";
import { Container, Text } from "@/ui/components";
import type Client from "@/classes/client";
import { extractDuration, msToHuman } from "@/utils/duration";
import { createGuildBan } from "@/utils/guildBan";
import { deliverPunishmentDm, sendPunishmentResponse } from "@/utils/invoke";
import { createModerationCase } from "@/utils/moderationCase";

async function executeBan({
  message,
  client,
  target,
  reason,
  durationMs,
}: {
  message: Message;
  client: Client;
  target: User;
  reason: string;
  durationMs: number | null;
}): Promise<void> {
  if (!message.guild) {
    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(icons.ban + " " + client.i18n.t("commands.ban.guild_only")),
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
          Text(icons.ban + " " + client.i18n.t("commands.ban.self")),
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
          Text(icons.ban + " " + client.i18n.t("commands.ban.bot")),
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
            Text(icons.ban + " " + client.i18n.t("commands.ban.not_bannable")),
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
              icons.ban + " " + client.i18n.t("commands.ban.role_hierarchy"),
            ),
          ),
        ],
      });

      return;
    }
  }

  const auditReason =
    durationMs !== null
      ? `${message.author.tag} (temp-ban ${msToHuman(durationMs)}): ${reason}`
      : `${message.author.tag}: ${reason}`;

  const action = durationMs !== null ? "tempban" : "ban";
  const durationStr = durationMs !== null ? msToHuman(durationMs) : undefined;

  const caseNumber = await createModerationCase({
    guildId: message.guild.id,
    type: action,
    userId: target.id,
    moderatorId: message.author.id,
    reason,
    duration: durationMs,
    expiresAt: durationMs !== null ? new Date(Date.now() + durationMs) : null,
  });

  try {
    await deliverPunishmentDm({
      guild: message.guild,
      target,
      action,
      moderator: message.author,
      reason,
      duration: durationStr,
      caseNumber,
      fallback: async () => {
        await target.send({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(
                durationMs !== null
                  ? client.i18n.t("commands.ban.dm_temp", {
                      guild: message.guild!.name,
                      duration: durationStr!,
                      reason,
                    })
                  : client.i18n.t("commands.ban.dm", {
                      guild: message.guild!.name,
                      reason,
                    }),
              ),
            ),
          ],
        });
      },
    });
    await message.guild.members.ban(target, {
      reason: auditReason,
    });
  } catch {
    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(icons.ban + " " + client.i18n.t("commands.ban.failed")),
        ),
      ],
    });

    return;
  }

  if (durationMs !== null) {
    try {
      await createGuildBan({
        client,
        guildId: message.guild.id,
        userId: target.id,
        reason,
        durationMs,
      });
    } catch {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(icons.ban + " " + client.i18n.t("commands.ban.failed")),
          ),
        ],
      });

      return;
    }
  }

  await sendPunishmentResponse({
    message,
    target,
    action,
    moderator: message.author,
    reason,
    duration: durationStr,
    caseNumber,
    fallback: async () => {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              durationMs !== null
                ? client.i18n.t("commands.ban.success_temp", {
                    user: target.tag,
                    duration: durationStr!,
                    reason,
                  })
                : client.i18n.t("commands.ban.success", {
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
  name: "ban",
  description: "Ban a user, optionally with a duration.",
  category: "Moderation",
  guildOnly: true,
  userPermissions: ["BanMembers"],
  botPermissions: ["BanMembers"],

  arguments: [
    {
      name: "user",
      aliases: ["u", "member", "target"],
      type: "user",
      description: "The user to ban.",
      required: true,
    },
    {
      name: "reason",
      aliases: ["r"],
      type: "string",
      description:
        "Optional duration (e.g. 1d, 12h) followed by a reason. E.g. `1d spamming` or just `spamming`.",
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
              icons.ban + " " + client.i18n.t("commands.ban.user_not_found"),
            ),
          ),
        ],
      });

      return;
    }

    const rawReason = args.getString("reason") ?? "No reason provided.";

    const { durationMs, rest } = extractDuration(rawReason);

    const reason =
      durationMs !== null ? rest || "No reason provided." : rawReason;

    await executeBan({
      client,
      message,
      target,
      reason,
      durationMs,
    });
  },
});
