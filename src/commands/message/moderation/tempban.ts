import { MessageFlags, type Message, type User } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand } from "@/classes/Command";
import { Container, Text } from "@/ui/components";
import type Client from "@/classes/client";
import { parseDuration, msToHuman } from "@/utils/duration";
import { createGuildBan } from "@/utils/guildBan";

async function executeTempban({
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
  durationMs: number;
}): Promise<void> {
  if (!message.guild) {
    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(icons.ban + " " + client.i18n.t("commands.tempban.guild_only")),
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
          Text(icons.ban + " " + client.i18n.t("commands.tempban.self")),
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
          Text(icons.ban + " " + client.i18n.t("commands.tempban.bot")),
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
              icons.ban + " " + client.i18n.t("commands.tempban.not_bannable"),
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
                client.i18n.t("commands.tempban.role_hierarchy"),
            ),
          ),
        ],
      });

      return;
    }
  }

  const auditReason = `${message.author.tag} (temp-ban ${msToHuman(durationMs)}): ${reason}`;

  try {
    try {
      await target.send({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              client.i18n.t("commands.tempban.dm", {
                guild: message.guild.name,
                duration: msToHuman(durationMs),
                reason,
              }),
            ),
          ),
        ],
      });
    } catch {}

    await message.guild.members.ban(target, {
      reason: auditReason,
    });
  } catch {
    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(icons.ban + " " + client.i18n.t("commands.tempban.failed")),
        ),
      ],
    });

    return;
  }

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
          Text(icons.ban + " " + client.i18n.t("commands.tempban.failed")),
        ),
      ],
    });

    return;
  }

  await message.reply({
    flags: MessageFlags.IsComponentsV2,
    components: [
      new Container().text(
        Text(
          client.i18n.t("commands.tempban.success", {
            user: target.tag,
            duration: msToHuman(durationMs),
            reason,
          }),
        ),
      ),
    ],
  });
}

export default new MessageCommand({
  name: "tempban",
  description: "Temporarily ban a user.",
  aliases: ["tb"],
  category: "Moderation",
  guildOnly: true,
  userPermissions: ["BanMembers"],
  botPermissions: ["BanMembers"],

  arguments: [
    {
      name: "user",
      aliases: ["u", "member", "target"],
      type: "user",
      description: "The user to temporarily ban.",
      required: true,
    },
    {
      name: "duration",
      aliases: ["d"],
      type: "string",
      description: "The duration of the ban (e.g. 1d, 12h, 30m).",
      required: true,
    },
    {
      name: "reason",
      aliases: ["r"],
      type: "string",
      description: "The reason for the ban.",
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
                client.i18n.t("commands.tempban.user_not_found"),
            ),
          ),
        ],
      });

      return;
    }

    const durationInput = args.getString("duration") ?? "";
    const durationMs = parseDuration(durationInput.trim());

    if (!durationMs || !Number.isFinite(durationMs) || durationMs <= 0) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.ban +
                " " +
                client.i18n.t("commands.tempban.invalid_duration"),
            ),
          ),
        ],
      });

      return;
    }

    const reason = args.getString("reason") ?? "No reason provided.";

    await executeTempban({
      client,
      message,
      target,
      reason,
      durationMs,
    });
  },
});
