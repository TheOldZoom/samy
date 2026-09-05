import {
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import { SlashCommand } from "@/classes/Command";
import type { UrbanDefinition } from "@/commands/shared/urban";
import { UrbanResult } from "@/commands/shared/urban";
import errorUI from "@/ui/error";

export default new SlashCommand({
  data: new SlashCommandBuilder()
    .setName("urban")
    .setDescription("Search Urban Dictionary for a definition.")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("The word or phrase to search for.")
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

  category: "Fun",

  async execute(client, interaction) {
    await interaction.deferReply();

    const query = interaction.options.getString("query", true);

    try {
      const response = await fetch(
        `https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(query)}`,
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as { list: UrbanDefinition[] };

      if (!data.list.length) {
        await interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            errorUI(client.i18n.t("commands.urban.no_results", { query })),
          ],
        });

        return;
      }

      const top = data.list[0]!;

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [UrbanResult(client, top)],
      });
    } catch (error) {
      client.logger.error("Failed to fetch Urban Dictionary definition", {
        error,
        query,
      });

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [errorUI(client.i18n.t("commands.urban.fetch_error"))],
      });
    }
  },
});
