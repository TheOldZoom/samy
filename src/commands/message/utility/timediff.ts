import { MessageFlags } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand } from "@/classes/Command";
import { TimediffResult } from "@/commands/shared/timediff";
import errorUI from "@/ui/error";

export default new MessageCommand({
  name: "timediff",
  description:
    "Calculate the time difference between two Discord snowflake IDs.",
  category: "Utility",
  aliases: ["snowdiff", "timebetween"],
  arguments: [
    {
      name: "snowflake1",
      aliases: ["first", "a"],
      type: "string",
      description: "The first Discord snowflake ID.",
      required: true,
    },
    {
      name: "snowflake2",
      aliases: ["second", "b"],
      type: "string",
      description: "The second Discord snowflake ID.",
      required: true,
    },
  ],

  async execute(client, message, args) {
    const id1 = args.getString("snowflake1");
    const id2 = args.getString("snowflake2");

    if (!id1 || !id2) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [errorUI(icons.clock + " " + client.i18n.t("commands.timediff.provide"))],
      });
      return;
    }

    const container = TimediffResult(client, id1, id2);

    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    });
  },
});
