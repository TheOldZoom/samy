import { MessageFlags } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand } from "@/classes/Command";
import { GuildBanner } from "@/commands/shared/guildbanner";
import errorUI from "@/ui/error";

export default new MessageCommand({
  name: "guildbanner",
  description: "View the server's banner.",
  category: "Utility",
  aliases: ["serverbannerbg", "guildbannerbg"],
  guildOnly: true,

  async execute(client, message) {
    if (!message.guild) return;

    try {
      const container = GuildBanner(client, message.guild);

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    } catch (error) {
      client.logger.error("Failed to fetch guild banner", {
        error,
        guild: message.guild.id,
      });

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          errorUI(
            icons.image +
              " " +
              client.i18n.t("commands.guildbanner.fetch_error"),
          ),
        ],
      });
    }
  },
});
