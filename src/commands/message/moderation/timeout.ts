import { MessageFlags, type Message, type User } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand } from "@/classes/Command";
import { Container, Text } from "@/ui/components";
import type Client from "@/classes/client";
import { msToHuman, parseDuration } from "@/utils/duration";

const MAX_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1000;

async function executeTimeout({
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
          Text(icons.timeout + " " + client.i18n.t("commands.timeout.guild_only")),
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
        new Container().text(Text(icons.timeout + " " + client.i18n.t("commands.timeout.self"))),
      ],
    });

    return;
  }

  if (target.id === client.user?.id) {
    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(Text(icons.timeout + " " + client.i18n.t("commands.timeout.bot"))),
      ],
    });

    return;
  }

  if (!member) {
    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(icons.timeout + " " + client.i18n.t("commands.timeout.not_in_guild")),
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
          Text(icons.timeout + " " + client.i18n.t("commands.timeout.not_moderatable")),
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
          Text(icons.timeout + " " + client.i18n.t("commands.timeout.role_hierarchy")),
        ),
      ],
    });

    return;
  }

  const cappedDurationMs = Math.min(durationMs, MAX_TIMEOUT_MS);

  try {
    await member.timeout(cappedDurationMs, `${message.author.tag}: ${reason}`);
  } catch {
    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(Text(icons.timeout + " " + client.i18n.t("commands.timeout.failed"))),
      ],
    });

    return;
  }

  await message.reply({
    flags: MessageFlags.IsComponentsV2,
    components: [
      new Container().text(
        Text(icons.timeout + " " + client.i18n.t("commands.timeout.success", {
            user: target.tag,
            duration: msToHuman(cappedDurationMs),
            reason,
          }),
        ),
      ),
    ],
  });
}

export default new MessageCommand({
  name: "timeout",
  description: "Timeout a user for a specified duration.",
  aliases: ["mute", "to"],
  category: "Moderation",
  guildOnly: true,
  userPermissions: ["ModerateMembers"],
  botPermissions: ["ModerateMembers"],

  arguments: [
    {
      name: "user",
      aliases: ["u", "member", "target"],
      type: "user",
      description: "The user to timeout.",
      required: true,
    },
    {
      name: "duration",
      aliases: ["d", "time", "t"],
      type: "string",
      description: "Duration of the timeout (e.g. 10m, 1h, 7d). Max 28 days.",
      required: false,
      default: "10m",
    },
    {
      name: "reason",
      aliases: ["r"],
      type: "string",
      description: "Reason for the timeout.",
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
            Text(icons.timeout + " " + client.i18n.t("commands.timeout.user_not_found")),
          ),
        ],
      });

      return;
    }

    const durationInput = args.getString("duration") ?? "10m";
    const durationMs = parseDuration(durationInput);

    if (durationMs === null) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(icons.timeout + " " + client.i18n.t("commands.timeout.invalid_duration")),
          ),
        ],
      });

      return;
    }

    await executeTimeout({
      client,
      message,
      target,
      durationMs,
      reason: args.getString("reason") ?? "No reason provided.",
    });
  },
});
