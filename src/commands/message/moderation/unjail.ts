import { MessageFlags } from "discord.js";
import { MessageCommand } from "@/classes/Command";
import { Container, Text } from "@/ui/components";
import { icons } from "@/utils/icons";
import { unjailMember } from "@/utils/jail";
import { sendPunishmentResponse } from "@/utils/invoke";

export default new MessageCommand({
  name: "unjail",
  description: "Release a member from the server jail and restore their roles.",
  aliases: ["unprison"],
  category: "Moderation",
  guildOnly: true,
  userPermissions: ["ModerateMembers"],
  botPermissions: ["ManageRoles"],

  arguments: [
    {
      name: "user",
      aliases: ["u", "member", "target"],
      type: "user",
      description: "The user to release from jail.",
      required: true,
    },
    {
      name: "reason",
      aliases: ["r"],
      type: "string",
      description: "Reason for unjailing.",
      required: false,
      default: "No reason provided.",
    },
  ],

  async execute(client, message, args) {
    if (!message.guild) return;

    const target = args.getUser("user");
    if (!target) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.unlock +
                " " +
                client.i18n.t("commands.unjail.user_not_found"),
            ),
          ),
        ],
      });
      return;
    }

    const reason = args.getString("reason") ?? "No reason provided.";

    const result = await unjailMember({
      client,
      guild: message.guild,
      userId: target.id,
      moderator: message.author,
      reason,
    });

    if (!result.success) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.unlock + " " + client.i18n.t("commands.unjail.not_jailed"),
            ),
          ),
        ],
      });
      return;
    }

    await sendPunishmentResponse({
      message,
      target,
      action: "unjail",
      moderator: message.author,
      reason,
      fallback: async () => {
        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(
                icons.unlock +
                  " " +
                  client.i18n.t("commands.unjail.success", {
                    user: target.tag,
                    reason,
                  }),
              ),
            ),
          ],
        });
      },
    });
  },
});
