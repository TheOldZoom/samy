import {
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import { icons } from "@/utils/icons";

import { SlashCommand } from "@/classes/Command";
import { RandomHexResult } from "@/commands/shared/randomhex";
import errorUI from "@/ui/error";

export default new SlashCommand({
  data: new SlashCommandBuilder()
    .setName("randomhex")
    .setDescription("Generate a random hex color.")
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
    try {
      await interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [RandomHexResult(client)],
      });
    } catch (error) {
      client.logger.error("Failed to generate random hex", { error });

      await interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [
          errorUI(
            icons.colornitro +
              " " +
              client.i18n.t("commands.randomhex.fetch_error"),
          ),
        ],
      });
    }
  },
});
