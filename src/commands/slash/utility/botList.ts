import { MessageFlags, SlashCommandBuilder } from "discord.js";

import { SlashCommand } from "@/classes/Command";
import { buildBotListView } from "@/ui/botList";
import errorUI from "@/ui/error";

export default new SlashCommand({
  data: new SlashCommandBuilder()
    .setName("botlist")
    .setDescription("List all bots in the server."),
  category: "Utility",
  guildOnly: true,

  async execute(client, interaction) {
    if (!interaction.guild) return;

    try {
      const container = buildBotListView(
        client,
        interaction.user.id,
        interaction.guild,
      );

      await interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    } catch (error) {
      client.logger.error("Failed to fetch bot list", {
        error,
        guild: interaction.guild.id,
      });

      await interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [errorUI(client.i18n.t("commands.botlist.fetch_error"))],
      });
    }
  },
});
