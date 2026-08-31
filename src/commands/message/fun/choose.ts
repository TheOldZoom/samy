import { MessageFlags } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand } from "@/classes/Command";
import { ChooseResult } from "@/commands/shared/choose";
import errorUI from "@/ui/error";

export default new MessageCommand({
  name: "choose",
  description: "Randomly choose one of several options.",
  category: "Fun",
  aliases: ["pick", "choice"],
  arguments: [
    {
      name: "options",
      aliases: ["o"],
      type: "string",
      description: "Options to choose from, separated by commas or spaces.",
      required: true,
    },
  ],

  async execute(client, message, args) {
    const raw = args.getString("options");

    if (!raw) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [errorUI(icons.spark + " " + client.i18n.t("commands.choose.provide_options"))],
      });
      return;
    }

    const options = raw
      .split(",")
      .flatMap((part) => part.trim().split(/\s+/))
      .map((part) => part.trim())
      .filter(Boolean);

    const container = ChooseResult(client, options);

    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    });
  },
});
