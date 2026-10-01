import { ApplicationCommandOptionType, escapeMarkdown } from "discord.js";
import Command from "@/classes/Command";
import { icons } from "@/utils/icons";
import { failureResponse } from "@/utils/randomContent";
import { suggestLanguages, translate } from "@/utils/translation";
import { Container, Text, v2 } from "@/utils/ui/components";

export default new Command({
  name: "translate",
  description: "Translate text between languages",
  everywhere: true,
  ephemeral: true,
  cooldown: 10,
  options: [
    {
      name: "text",
      description: "The text to translate",
      type: ApplicationCommandOptionType.String,
      required: true,
      max_length: 400,
    },
    {
      name: "from",
      description: "Source language (detected automatically by default)",
      type: ApplicationCommandOptionType.String,
      min_length: 2,
      max_length: 10,
      autocomplete: true,
    },
    {
      name: "to",
      description: "Target language (defaults to English)",
      type: ApplicationCommandOptionType.String,
      min_length: 2,
      max_length: 6,
      autocomplete: true,
    },
  ],

  async autocomplete(_client, interaction) {
    const focused = interaction.options.getFocused(true);
    if (focused.name !== "from" && focused.name !== "to") {
      await interaction.autocomplete({ choices: [] });
      return;
    }

    const counterpart = interaction.options.getString(
      focused.name === "from" ? "to" : "from",
    );
    await interaction.autocomplete({
      choices: suggestLanguages(
        String(focused.value),
        counterpart,
        focused.name === "from",
      ),
    });
  },

  async execute(_client, interaction) {
    await interaction.defer();

    const text = interaction.getOptionValue(
      "text",
      ApplicationCommandOptionType.String,
    )!;
    const fromInput =
      interaction.getOptionValue("from", ApplicationCommandOptionType.String) ??
      "auto";
    const toInput =
      interaction.getOptionValue("to", ApplicationCommandOptionType.String) ??
      "en";

    try {
      const translation = await translate(text, fromInput, toInput);

      await interaction.reply({
        ...v2(
          new Container().text(
            Text(
              `-# ${icons.translate} · Translation · **${translation.from} → ${translation.to}**`,
            ),
            Text(
              `> ${escapeMarkdown(translation.text).replaceAll("\n", "\n> ")}`,
            ),
          ),
        ),
        allowedMentions: { parse: [] },
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith("Use a two-letter")
      ) {
        await interaction.reply({
          ...v2(
            new Container().text(Text(`${icons.Wrong} · ${error.message}`)),
          ),
          ephemeral: true,
        });
        return;
      }

      await interaction.reply(failureResponse("translation"));
    }
  },
});
