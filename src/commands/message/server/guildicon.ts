import { MessageFlags } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand } from "@/classes/Command";
import { GuildIcon } from "@/commands/shared/guildicon";
import errorUI from "@/ui/error";

export default new MessageCommand({
  name: "guildicon",
  description: "View the server's icon.",
  category: "Utility",
  aliases: ["servericon", "guildavatar", "icon"],
  guildOnly: true,

  async execute(client, message) {
    if (!message.guild) return;

    try {
      const container = GuildIcon(client, message.guild);

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    } catch (error) {
      client.logger.error("Failed to fetch guild icon", {
        error,
        guild: message.guild.id,
      });

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [errorUI(icons.image + " " + client.i18n.t("commands.guildicon.fetch_error"))],
      });
    }
  },
});
