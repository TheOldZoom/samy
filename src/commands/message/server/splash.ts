import { MessageFlags } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand } from "@/classes/Command";
import { Splash } from "@/commands/shared/splash";
import errorUI from "@/ui/error";

export default new MessageCommand({
  name: "splash",
  description: "View the server's splash background.",
  category: "Utility",
  aliases: ["splashbg", "invitebackground"],
  guildOnly: true,

  async execute(client, message) {
    if (!message.guild) return;

    try {
      const container = Splash(client, message.guild);

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    } catch (error) {
      client.logger.error("Failed to fetch splash background", {
        error,
        guild: message.guild.id,
      });

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [errorUI(icons.image + " " + client.i18n.t("commands.splash.fetch_error"))],
      });
    }
  },
});
