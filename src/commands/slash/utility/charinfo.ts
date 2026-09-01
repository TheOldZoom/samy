import {
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import { SlashCommand } from "@/classes/Command";
import { CharInfoResult } from "@/commands/shared/charinfo";

export default new SlashCommand({
  data: new SlashCommandBuilder()
    .setName("charinfo")
    .setDescription(
      "Get information about a character (codepoint, UTF-8, etc.).",
    )
    .addStringOption((option) =>
      option
        .setName("character")
        .setDescription("The character to inspect.")
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
    const raw = interaction.options.getString("character", true);

    await interaction.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [CharInfoResult(client, raw)],
    });
  },
});
