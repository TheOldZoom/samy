import {
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import { icons } from "@/utils/icons";

import { SlashCommand } from "@/classes/Command";
import { ServerBanner } from "@/commands/shared/serverbanner";
import errorUI from "@/ui/error";

export default new SlashCommand({
  data: new SlashCommandBuilder()
    .setName("serverbanner")
    .setDescription("View a user's server-specific banner.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to get the server banner from")
        .setRequired(false),
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
  guildOnly: true,

  async execute(client, interaction) {
    if (!interaction.guild) return;

    const target = interaction.options.getUser("user") ?? interaction.user;
    const member = interaction.guild.members.cache.get(target.id);

    await interaction.deferReply();

    try {
      const container = await ServerBanner(client, target, member);

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    } catch (error) {
      client.logger.error("Failed to fetch server banner", {
        error,
        user: target.id,
      });

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          errorUI(icons.image + " " + client.i18n.t("commands.serverbanner.fetch_error")),
        ],
      });
    }
  },
});
