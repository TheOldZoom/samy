import { MessageFlags } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand } from "@/classes/Command";
import { Container, Text } from "@/ui/components";

export default new MessageCommand({
  name: "unhardban",
  description: "Remove a user's hard ban status, allowing them to rejoin.",
  aliases: ["uhb"],
  category: "Moderation",
  guildOnly: true,
  userPermissions: ["BanMembers"],
  botPermissions: ["BanMembers"],

  arguments: [
    {
      name: "user",
      aliases: ["u", "member", "target"],
      type: "user",
      description: "The user to unhardban.",
      required: true,
    },
    {
      name: "reason",
      aliases: ["r"],
      type: "string",
      description: "The reason for the unhardban.",
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
                client.i18n.t("commands.unhardban.guild_only"),
            ),
          ),
        ],
      });

      return;
    }

    const target = args.getUser("user");

    if (!target) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.unbanmember +
                " " +
                client.i18n.t("commands.unhardban.user_not_found"),
            ),
          ),
        ],
      });

      return;
    }

    const hardBan = await client.prisma.hardBan.findUnique({
      where: {
        guildId_userId: {
          guildId: message.guild.id,
          userId: target.id,
        },
      },
    });

    if (!hardBan) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.unbanmember +
                " " +
                client.i18n.t("commands.unhardban.not_hardbanned", {
                  user: target.tag,
                }),
            ),
          ),
        ],
      });

      return;
    }

    try {
      await client.prisma.hardBan.delete({
        where: {
          guildId_userId: {
            guildId: message.guild.id,
            userId: target.id,
          },
        },
      });
    } catch {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.unbanmember +
                " " +
                client.i18n.t("commands.unhardban.failed"),
            ),
          ),
        ],
      });

      return;
    }

    const reason = args.getString("reason") ?? "No reason provided.";

    try {
      await message.guild.members.unban(
        target.id,
        `${message.author.tag}: ${reason}`,
      );
    } catch {
      // ignore unban errors
    }

    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(
            client.i18n.t("commands.unhardban.success", {
              user: target.tag,
              reason,
            }),
          ),
        ),
      ],
    });
  },
});
