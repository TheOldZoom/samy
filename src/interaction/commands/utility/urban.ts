import { ApplicationCommandOptionType, escapeMarkdown } from "discord.js";
import Command from "@/classes/Command";
import { icons } from "@/utils/icons";
import { failureResponse, textResponse } from "@/utils/randomContent";
import { buildUrbanView, cacheUrbanSearch, searchUrban } from "@/utils/urban";
import { v2 } from "@/utils/ui/components";

export default new Command({
  name: "urban",
  description: "Search Urban Dictionary for a definition.",
  everywhere: true,
  cooldown: 5,
  options: [
    {
      name: "query",
      description: "The word or phrase to search for.",
      type: ApplicationCommandOptionType.String,
      required: true,
      max_length: 100,
    },
  ],

  async execute(client, interaction) {
    await interaction.defer();

    const query = interaction
      .getOptionValue("query", ApplicationCommandOptionType.String)!
      .trim();

    try {
      const definitions = await searchUrban(query);

      if (!definitions.length) {
        await interaction.reply(
          textResponse(
            icons.Wrong,
            "Urban Dictionary",
            `No definitions found for **${escapeMarkdown(query)}**.`,
          ),
        );
        return;
      }

      const token = cacheUrbanSearch(definitions);

      await interaction.reply({
        ...v2(buildUrbanView(definitions, 0, token, interaction.user.id)),
        allowedMentions: { parse: [] },
      });
    } catch (error) {
      client.logger.error(
        { err: error, query },
        "Failed to fetch Urban Dictionary definition",
      );

      await interaction.reply(failureResponse("definition"));
    }
  },
});
