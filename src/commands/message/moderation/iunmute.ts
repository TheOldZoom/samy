import { MessageFlags } from "discord.js";
import { MessageCommand } from "@/classes/Command";
import { Container, Text } from "@/ui/components";
import { icons } from "@/utils/icons";
import { removeMute } from "@/utils/mute";
import { sendPunishmentResponse } from "@/utils/invoke";

export default new MessageCommand({
  name: "iunmute",
  description: "Unmute a user from image and attachment restrictions.",
  aliases: ["imageunmute"],
  category: "Moderation",
  guildOnly: true,
  userPermissions: ["ModerateMembers"],
  botPermissions: ["ManageRoles"],

  arguments: [
    {
      name: "user",
      aliases: ["u", "member", "target"],
      type: "user",
      description: "The user to image unmute.",
      required: true,
    },
    {
      name: "reason",
      aliases: ["r"],
      type: "string",
      description: "Reason for unmuting.",
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
              icons.servermute +
                " " +
                client.i18n.t("commands.iunmute.user_not_found"),
            ),
          ),
        ],
      });
      return;
    }

    const reason = args.getString("reason") ?? "No reason provided.";

    await removeMute({
      client,
      guild: message.guild,
      userId: target.id,
      type: "image",
      moderator: message.author,
      reason,
    });

    await sendPunishmentResponse({
      message,
      target,
      action: "iunmute",
      moderator: message.author,
      reason,
      fallback: async () => {
        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(
                icons.servermute +
                  " " +
                  client.i18n.t("commands.iunmute.success", {
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
