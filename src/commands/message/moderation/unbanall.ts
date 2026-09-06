import { MessageFlags } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand } from "@/classes/Command";
import { Container, Text } from "@/ui/components";

export default new MessageCommand({
  name: "unbanall",
  description: "Unban all banned users.",
  aliases: ["uba"],
  category: "Moderation",
  guildOnly: true,
  userPermissions: ["BanMembers"],
  botPermissions: ["BanMembers"],

  arguments: [
    {
      name: "reason",
      aliases: ["r"],
      type: "string",
      description: "The reason for the mass unban.",
      required: false,
      default: "No reason provided.",
    },
  ],

  async execute(client, message, args) {
    if (!message.guild) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.unbanmember +
                " " +
                client.i18n.t("commands.unbanall.guild_only"),
            ),
          ),
        ],
      });

      return;
    }

    const reason = args.getString("reason") ?? "No reason provided.";

    let bannedUsers;
    try {
      bannedUsers = await message.guild.bans.fetch();
    } catch {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.unbanmember +
                " " +
                client.i18n.t("commands.unbanall.failed"),
            ),
          ),
        ],
      });

      return;
    }

    if (bannedUsers.size === 0) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.unbanmember + " " + client.i18n.t("commands.unbanall.none"),
            ),
          ),
        ],
      });

      return;
    }

    const userIds = bannedUsers.map((ban) => ban.user.id);

    let successCount = 0;
    let failCount = 0;

    for (const userId of userIds) {
      try {
        await message.guild.members.unban(
          userId,
          `${message.author.tag}: ${reason}`,
        );
        successCount++;
      } catch {
        failCount++;
      }
    }

    const guildId = message.guild.id;

    try {
      await client.prisma.guildBan.deleteMany({
        where: {
          guildId,
          userId: { in: userIds },
        },
      });
    } catch {
      // ignore database errors
    }

    try {
      await client.prisma.hardBan.deleteMany({
        where: {
          guildId,
          userId: { in: userIds },
        },
      });
    } catch {
      // ignore database errors
    }

    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(
            client.i18n.t("commands.unbanall.success", {
              success: successCount.toString(),
              failed: failCount.toString(),
              reason,
            }),
          ),
        ),
      ],
    });
  },
});
