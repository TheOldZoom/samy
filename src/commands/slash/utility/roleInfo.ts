import { MessageFlags, SlashCommandBuilder } from "discord.js";

import { SlashCommand } from "@/classes/Command";
import { RoleInfo } from "@/commands/shared/roleInfo";
import errorUI from "@/ui/error";

export default new SlashCommand({
  data: new SlashCommandBuilder()
    .setName("roleinfo")
    .setDescription("Get information about a role.")
    .addRoleOption((option) =>
      option
        .setName("role")
        .setDescription("The role to get information about")
        .setRequired(true),
    ),
  category: "Utility",
  guildOnly: true,

  async execute(client, interaction) {
    const role = interaction.options.getRole("role", true);
    const resolvedRole = interaction.guild?.roles.cache.get(role.id);

    if (!resolvedRole) {
      await interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [errorUI(client.i18n.t("commands.roleinfo.provide_role"))],
      });
      return;
    }

    try {
      const container = RoleInfo(client, resolvedRole);

      await interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    } catch (error) {
      client.logger.error("Failed to fetch role info", {
        error,
        role: resolvedRole.id,
      });

      await interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [errorUI(client.i18n.t("commands.roleinfo.fetch_error"))],
      });
    }
  },
});
