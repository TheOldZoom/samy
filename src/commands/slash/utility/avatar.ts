import {
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import { icons } from "@/utils/icons";

import { SlashCommand } from "@/classes/Command";
import { Avatar } from "@/commands/shared/avatar";
import errorUI from "@/ui/error";

export default new SlashCommand({
  data: new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("View a user's avatar.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to get the avatar from")
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

  async execute(client, interaction) {
    const target = interaction.options.getUser("user") ?? interaction.user;
    const member = interaction.guild?.members.cache.get(target.id);

    await interaction.deferReply();

    try {
      const container = Avatar(client, target, member);

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    } catch (error) {
      client.logger.error("Failed to fetch avatar", {
        error,
        user: target.id,
      });

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          errorUI(
            icons.image + " " + client.i18n.t("commands.avatar.fetch_error"),
          ),
        ],
      });
    }
  },
});
