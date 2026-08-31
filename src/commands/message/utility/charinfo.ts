import { MessageFlags } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand } from "@/classes/Command";
import { CharInfoResult } from "@/commands/shared/charinfo";
import errorUI from "@/ui/error";

export default new MessageCommand({
  name: "charinfo",
  description: "Get information about a character (codepoint, UTF-8, etc.).",
  category: "Utility",
  aliases: ["char", "character"],
  arguments: [
    {
      name: "character",
      aliases: ["char"],
      type: "string",
      description: "The character to inspect.",
      required: true,
    },
  ],

  async execute(client, message, args) {
    const raw = args.getString("character");

    if (!raw) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [errorUI(icons.info + " " + client.i18n.t("commands.charinfo.provide"))],
      });
      return;
    }

    const container = CharInfoResult(client, raw);

    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    });
  },
});
