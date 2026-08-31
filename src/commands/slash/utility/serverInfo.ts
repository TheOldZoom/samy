import {
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import { SlashCommand } from "@/classes/Command";
import { ServerInfo } from "@/commands/shared/serverInfo";
import errorUI from "@/ui/error";

export default new SlashCommand({
  data: new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("Get information about the server."),

  category: "Utility",
  guildOnly: true,

  async execute(client, interaction) {
    if (!interaction.guild) return;

    await interaction.deferReply();

    try {
      const containers = await ServerInfo(client, interaction.guild);

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: containers,
      });
    } catch (error) {
      client.logger.error("Failed to fetch server info", {
        error,
        guild: interaction.guild.id,
      });

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [errorUI(client.i18n.t("commands.serverinfo.fetch_error"))],
      });
    }
  },
});
