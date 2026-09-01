import { MessageFlags } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand } from "@/classes/Command";
import { ServerBanner } from "@/commands/shared/serverbanner";
import errorUI from "@/ui/error";

export default new MessageCommand({
  name: "serverbanner",
  description: "View a user's server-specific banner.",
  category: "Utility",
  aliases: ["guildbannerbg", "serverbannerbg"],
  guildOnly: true,
  arguments: [
    {
      name: "user",
      description: "The user to get the server banner from",
      aliases: ["u"],
      type: "user",
    },
  ],

  async execute(client, message, args) {
    const target = args.getUser("user") ?? message.author;
    const member = message.guild?.members.cache.get(target.id);

    try {
      const container = await ServerBanner(client, target, member);

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    } catch (error) {
      client.logger.error("Failed to fetch server banner", {
        error,
        user: target.id,
      });

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          errorUI(
            icons.image +
              " " +
              client.i18n.t("commands.serverbanner.fetch_error"),
          ),
        ],
      });
    }
  },
});
