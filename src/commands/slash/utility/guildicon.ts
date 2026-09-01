import {
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import { icons } from "@/utils/icons";

import { SlashCommand } from "@/classes/Command";
import { GuildIcon } from "@/commands/shared/guildicon";
import errorUI from "@/ui/error";

export default new SlashCommand({
  data: new SlashCommandBuilder()
    .setName("guildicon")
    .setDescription("View the server's icon.")
    .setContexts(
      InteractionContextType.BotDM,
      InteractionContextType.Guild,
      InteractionContextType.PrivateChannel,
    )
    .setIntegrationTypes(
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall,
    ),

  category: "Utility",
  guildOnly: true,

  async execute(client, interaction) {
    if (!interaction.guild) return;

    try {
      const container = GuildIcon(client, interaction.guild);

      await interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    } catch (error) {
      client.logger.error("Failed to fetch guild icon", {
        error,
        guild: interaction.guild.id,
      });

      await interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [
          errorUI(
            icons.image + " " + client.i18n.t("commands.guildicon.fetch_error"),
          ),
        ],
      });
    }
  },
});
