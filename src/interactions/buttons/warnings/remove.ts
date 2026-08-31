import { MessageFlags } from "discord.js";

import { ButtonHandler } from "@/classes/Interaction";
import { renderWarningsList } from "@/ui/warnings";
import errorUI from "@/ui/error";

export default new ButtonHandler({
  namespace: "warnings",
  action: "remove",

  async execute(client, interaction, params, invokerId) {
    const guild = interaction.guild;
    if (!guild) return;

    const warningId = params[0];
    if (!warningId) return;

    const _page = Number(params[1] ?? 0);
    const _targetId = params[2];

    const warning = await client.prisma.warning.findFirst({
      where: { id: warningId, guildId: guild.id },
    });

    if (!warning) {
      await interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [errorUI(client.i18n.t("commands.warnings.not_found"))],
      });

      return;
    }

    try {
      await client.prisma.warning.delete({ where: { id: warning.id } });
    } catch {
      await interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [errorUI(client.i18n.t("commands.warnings.remove.failed"))],
      });

      return;
    }

    const container = await renderWarningsList(
      client,
      guild,
      invokerId,
      page,
      warning.userId,
    );

    await interaction.update({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    });
  },
});
