import { MessageFlags } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand } from "@/classes/Command";
import { Avatar } from "@/commands/shared/avatar";
import errorUI from "@/ui/error";

export default new MessageCommand({
  name: "avatar",
  description: "View a user's avatar.",
  category: "Utility",
  aliases: ["av", "a"],
  arguments: [
    {
      name: "user",
      description: "The user to get the avatar from",
      aliases: ["u"],
      type: "user",
    },
  ],

  async execute(client, message, args) {
    const target = args.getUser("user") ?? message.author;
    const member = message.guild?.members.cache.get(target.id);

    try {
      const container = Avatar(client, target, member);

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    } catch (error) {
      client.logger.error("Failed to fetch avatar", {
        error,
        user: target.id,
      });

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          errorUI(
            icons.image + " " + client.i18n.t("commands.avatar.fetch_error"),
          ),
        ],
      });
    }
  },
});
