import { MessageFlags, SlashCommandBuilder } from "discord.js";

import { SlashCommand } from "@/classes/Command";
import { ChannelInfo } from "@/commands/shared/channelInfo";
import errorUI from "@/ui/error";

export default new SlashCommand({
  data: new SlashCommandBuilder()
    .setName("channelinfo")
    .setDescription("Get information about a channel.")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("The channel to get information about")
        .setRequired(false),
    ),
  category: "Utility",
  guildOnly: true,

  async execute(client, interaction) {
    const targetId =
      interaction.options.getChannel("channel")?.id ?? interaction.channelId;
    const channel = interaction.guild?.channels.cache.get(targetId);

    if (!channel) {
      await interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [errorUI(client.i18n.t("commands.channelinfo.not_found"))],
      });
      return;
    }

    try {
      const container = ChannelInfo(client, channel);

      await interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    } catch (error) {
      client.logger.error("Failed to fetch channel info", {
        error,
        channel: channel.id,
      });

      await interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [
          errorUI(client.i18n.t("commands.channelinfo.fetch_error")),
        ],
      });
    }
  },
});
