import { MessageFlags } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand } from "@/classes/Command";
import { ServerAvatar } from "@/commands/shared/serveravatar";
import errorUI from "@/ui/error";

export default new MessageCommand({
  name: "serveravatar",
  description: "View a user's server-specific avatar.",
  category: "Utility",
  aliases: ["guildavatar", "serverpfp", "guildpfp"],
  guildOnly: true,
  arguments: [
    {
      name: "user",
      description: "The user to get the server avatar from",
      aliases: ["u"],
      type: "user",
    },
  ],

  async execute(client, message, args) {
    const target = args.getUser("user") ?? message.author;
    const member = message.guild?.members.cache.get(target.id);

    try {
      const container = ServerAvatar(client, target, member);

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    } catch (error) {
      client.logger.error("Failed to fetch server avatar", {
        error,
        user: target.id,
      });

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          errorUI(
            icons.image +
              " " +
              client.i18n.t("commands.serveravatar.fetch_error"),
          ),
        ],
      });
    }
  },
});
