import {
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import { SlashCommand } from "@/classes/Command";
import { MemberCount } from "@/commands/shared/memberCount";
import errorUI from "@/ui/error";

export default new SlashCommand({
  data: new SlashCommandBuilder()
    .setName("membercount")
    .setDescription("View the server's member count."),

  category: "Utility",
  guildOnly: true,

  async execute(client, interaction) {
    if (!interaction.guild) return;

    try {
      const container = MemberCount(client, interaction.guild);

      await interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    } catch (error) {
      client.logger.error("Failed to fetch member count", {
        error,
        guild: interaction.guild.id,
      });

      await interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [
          errorUI(client.i18n.t("commands.membercount.fetch_error")),
        ],
      });
    }
  },
});
