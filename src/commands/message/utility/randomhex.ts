import { MessageFlags } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand } from "@/classes/Command";
import { RandomHexResult } from "@/commands/shared/randomhex";
import errorUI from "@/ui/error";

export default new MessageCommand({
  name: "randomhex",
  description: "Generate a random hex color.",
  category: "Utility",
  aliases: ["randomcolor", "hex"],
  arguments: [],

  async execute(client, message) {
    try {
      const container = RandomHexResult(client);

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    } catch (error) {
      client.logger.error("Failed to generate random hex", { error });

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [errorUI(icons.colornitro + " " + client.i18n.t("commands.randomhex.fetch_error"))],
      });
    }
  },
});
