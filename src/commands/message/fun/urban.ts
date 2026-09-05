import { MessageCommand } from "@/classes/Command";
import type { UrbanDefinition } from "@/commands/shared/urban";
import { UrbanResult } from "@/commands/shared/urban";
import errorUI from "@/ui/error";
import { MessageFlags } from "discord.js";

import { icons } from "@/utils/icons";

export default new MessageCommand({
  name: "urban",
  description: "Search Urban Dictionary for a definition.",
  category: "Fun",
  aliases: ["ud", "dictionary", "define"],
  arguments: [
    {
      name: "query",
      description: "The word or phrase to search for.",
      aliases: ["q"],
      type: "string",
      required: true,
    },
  ],

  async execute(client, message, args) {
    const query = args.getString("query");

    if (!query) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          errorUI(
            icons.book + " " + client.i18n.t("commands.urban.provide_query"),
          ),
        ],
      });

      return;
    }

    try {
      const response = await fetch(
        `https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(query)}`,
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as { list: UrbanDefinition[] };

      if (!data.list.length) {
        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            errorUI(client.i18n.t("commands.urban.no_results", { query })),
          ],
        });

        return;
      }

      const top = data.list[0]!;

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [UrbanResult(client, top)],
      });
    } catch (error) {
      client.logger.error("Failed to fetch Urban Dictionary definition", {
        error,
        user: message.author.id,
        query,
      });

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [errorUI(client.i18n.t("commands.urban.fetch_error"))],
      });
    }
  },
});
