import { MessageFlags, type Message, type User } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand } from "@/classes/Command";
import { Container, Text } from "@/ui/components";
import type Client from "@/classes/client";
import { ensureGuild } from "@/utils/guild";

async function executeHardban({
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
          Text(icons.ban + " " + client.i18n.t("commands.hardban.guild_only")),
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
          Text(icons.ban + " " + client.i18n.t("commands.hardban.self")),
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
          Text(icons.ban + " " + client.i18n.t("commands.hardban.bot")),
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
              icons.ban + " " + client.i18n.t("commands.hardban.not_bannable"),
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
                client.i18n.t("commands.hardban.role_hierarchy"),
            ),
          ),
        ],
      });

      return;
    }
  }

  const existingHardBan = await client.prisma.hardBan.findUnique({
    where: {
      guildId_userId: {
        guildId: message.guild.id,
        userId: target.id,
      },
    },
  });

  if (existingHardBan) {
    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(
            icons.ban +
              " " +
              client.i18n.t("commands.hardban.already_hardbanned", {
                user: target.tag,
              }),
          ),
        ),
      ],
    });

    return;
  }

  const auditReason = `${message.author.tag} (hard-ban): ${reason}`;

  try {
    try {
      await target.send({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              client.i18n.t("commands.hardban.dm", {
                guild: message.guild.name,
                reason,
              }),
            ),
          ),
        ],
      });
    } catch {
      // ignore
    }

    await message.guild.members.ban(target, {
      reason: auditReason,
    });
  } catch {
    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(icons.ban + " " + client.i18n.t("commands.hardban.failed")),
        ),
      ],
    });

    return;
  }

  try {
    await ensureGuild(message.guild.id);

    await client.prisma.hardBan.create({
      data: {
        guildId: message.guild.id,
        userId: target.id,
        reason,
      },
    });
  } catch {
    // ignore - ban already succeeded
  }

  await message.reply({
    flags: MessageFlags.IsComponentsV2,
    components: [
      new Container().text(
        Text(
          client.i18n.t("commands.hardban.success", {
            user: target.tag,
            reason,
          }),
        ),
      ),
    ],
  });
}

export default new MessageCommand({
  name: "hardban",
  description: "Ban a user permanently. They will be re-banned if they rejoin.",
  aliases: ["hb"],
  category: "Moderation",
  guildOnly: true,
  userPermissions: ["BanMembers"],
  botPermissions: ["BanMembers"],

  arguments: [
    {
      name: "user",
      aliases: ["u", "member", "target"],
      type: "user",
      description: "The user to hard ban.",
      required: true,
    },
    {
      name: "reason",
      aliases: ["r"],
      type: "string",
      description: "The reason for the hard ban.",
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
                client.i18n.t("commands.hardban.user_not_found"),
            ),
          ),
        ],
      });

      return;
    }

    const reason = args.getString("reason") ?? "No reason provided.";

    await executeHardban({
      client,
      message,
      target,
      reason,
    });
  },
});
