import {
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import { icons } from "@/utils/icons";

import { SlashCommand } from "@/classes/Command";
import { ServerAvatar } from "@/commands/shared/serveravatar";
import errorUI from "@/ui/error";

export default new SlashCommand({
  data: new SlashCommandBuilder()
    .setName("serveravatar")
    .setDescription("View a user's server-specific avatar.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to get the server avatar from")
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
      const container = ServerAvatar(client, target, member);

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    } catch (error) {
      client.logger.error("Failed to fetch server avatar", {
        error,
        user: target.id,
      });

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          errorUI(
            icons.image +
              " " +
              client.i18n.t("commands.serveravatar.fetch_error"),
          ),
        ],
      });
    }
  },
});
