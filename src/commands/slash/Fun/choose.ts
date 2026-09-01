import {
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import { icons } from "@/utils/icons";

import { SlashCommand } from "@/classes/Command";
import { ChooseResult } from "@/commands/shared/choose";
import errorUI from "@/ui/error";

export default new SlashCommand({
  data: new SlashCommandBuilder()
    .setName("choose")
    .setDescription("Randomly choose one of several options.")
    .addStringOption((option) =>
      option
        .setName("options")
        .setDescription("Options to choose from, separated by commas.")
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
    const raw = interaction.options.getString("options", true);

    const options = raw
      .split(",")
      .flatMap((part) => part.trim().split(/\s+/))
      .map((part) => part.trim())
      .filter(Boolean);

    if (options.length < 2) {
      await interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [
          errorUI(
            icons.spark +
              " " +
              client.i18n.t("commands.choose.provide_options"),
          ),
        ],
      });
      return;
    }

    await interaction.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [ChooseResult(client, options)],
    });
  },
});
