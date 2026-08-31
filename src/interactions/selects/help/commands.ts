import { MessageFlags } from "discord.js";

import { SelectHandler } from "@/classes/Interaction";
import { buildCommandView } from "@/ui/help";
import errorUI from "@/ui/error";

export default new SelectHandler({
  namespace: "help",
  action: "commands",

  async execute(client, interaction, params, invokerId, value) {
    const [category, _page] = params;

    if (!category || !value) {
      return;
    }

    const container = buildCommandView(
      client,
      invokerId,
      category,
      value,
      0,
      0,
    );

    if (!container) {
      await interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,

        components: [
          errorUI(
            client.i18n.t("commands.help.not_found", {
              command: value,
            }),
          ),
        ],
      });

      return;
    }

    await interaction.update({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    });
  },
});
