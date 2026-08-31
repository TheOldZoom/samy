import { MessageFlags } from "discord.js";

import { SelectHandler } from "@/classes/Interaction";
import { buildSubcommandView } from "@/ui/help";
import errorUI from "@/ui/error";

export default new SelectHandler({
  namespace: "help",
  action: "subcommands",

  async execute(client, interaction, params, invokerId, value) {
    const [category, commandName, currentPath, categoryPage, _subPage] = params;

    if (!category || !commandName || !value) {
      return;
    }

    const path =
      !currentPath || currentPath === "-"
        ? [value]
        : [...currentPath.split(","), value];

    const container = buildSubcommandView(
      client,
      invokerId,
      category,
      commandName,
      path,
      Number(categoryPage ?? 0),
      0,
    );

    if (!container) {
      await interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,

        components: [
          errorUI(
            client.i18n.t("commands.help.not_found", {
              command: [commandName, ...path].join(" "),
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
