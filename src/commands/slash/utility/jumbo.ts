import {
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import { icons } from "@/utils/icons";

import { SlashCommand } from "@/classes/Command";
import { JumboResult } from "@/commands/shared/jumbo";
import errorUI from "@/ui/error";

export default new SlashCommand({
  data: new SlashCommandBuilder()
    .setName("jumbo")
    .setDescription("Enlarge a custom emoji.")
    .addStringOption((option) =>
      option
        .setName("emoji")
        .setDescription("The emoji to enlarge.")
        .setRequired(true),
    )
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

  async execute(client, interaction) {
    const raw = interaction.options.getString("emoji", true).trim();

    try {
      const container = JumboResult(client, raw, interaction.guild);

      await interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    } catch (error) {
      client.logger.error("Failed to enlarge emoji", { error, raw });

      await interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [errorUI(icons.image + " " + client.i18n.t("commands.jumbo.fetch_error"))],
      });
    }
  },
});
