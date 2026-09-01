import {
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import { SlashCommand } from "@/classes/Command";
import { TimediffResult } from "@/commands/shared/timediff";

export default new SlashCommand({
  data: new SlashCommandBuilder()
    .setName("timediff")
    .setDescription(
      "Calculate the time difference between two Discord snowflake IDs.",
    )
    .addStringOption((option) =>
      option
        .setName("snowflake1")
        .setDescription("The first Discord snowflake ID.")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("snowflake2")
        .setDescription("The second Discord snowflake ID.")
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
    const id1 = interaction.options.getString("snowflake1", true);
    const id2 = interaction.options.getString("snowflake2", true);

    await interaction.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [TimediffResult(client, id1, id2)],
    });
  },
});
