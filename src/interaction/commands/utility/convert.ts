import { ApplicationCommandOptionType, escapeMarkdown } from "discord.js";
import Command from "@/classes/Command";
import { convert, suggestConversions } from "@/utils/converter";
import { icons } from "@/utils/icons";
import { Container, Text, v2 } from "@/utils/ui/components";

export default new Command({
  name: "convert",
  description: "Convert between units and currencies",
  everywhere: true,
  ephemeral: true,
  cooldown: 3,
  options: [
    {
      name: "value",
      description: "The amount to convert",
      type: ApplicationCommandOptionType.Number,
      required: true,
    },
    {
      name: "from",
      description: "Source unit or currency code, such as km or USD",
      type: ApplicationCommandOptionType.String,
      required: true,
      max_length: 32,
      autocomplete: true,
    },
    {
      name: "to",
      description: "Target unit or currency code, such as mi or EUR",
      type: ApplicationCommandOptionType.String,
      required: true,
      max_length: 32,
      autocomplete: true,
    },
  ],

  async autocomplete(_client, interaction) {
    const focused = interaction.options.getFocused(true);
    const counterpart = interaction.options.getString(
      focused.name === "from" ? "to" : "from",
    );
    const choices = await suggestConversions(
      String(focused.value),
      counterpart,
    );
    await interaction.autocomplete({ choices });
  },

  async execute(_client, interaction) {
    await interaction.defer();

    const value = interaction.getOptionValue(
      "value",
      ApplicationCommandOptionType.Number,
    )!;
    const from = interaction.getOptionValue(
      "from",
      ApplicationCommandOptionType.String,
    )!;
    const to = interaction.getOptionValue(
      "to",
      ApplicationCommandOptionType.String,
    )!;

    try {
      const conversion = await convert(value, from, to);

      await interaction.reply({
        ...v2(
          new Container().text(
            Text(
              `-# ${icons.coin} · Conversion · ${escapeMarkdown(conversion.detail)}`,
            ),
            Text(
              [
                `**${escapeMarkdown(conversion.input)}**`,
                `\`${escapeMarkdown(conversion.output)}\``,
                conversion.exchangeRate
                  ? `-# ${escapeMarkdown(conversion.exchangeRate)}`
                  : null,
              ]
                .filter(Boolean)
                .join("\n"),
            ),
          ),
        ),
        allowedMentions: { parse: [] },
      });
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "Conversion failed";
      await interaction.reply({
        ...v2(
          new Container().text(
            Text(`${icons.Wrong} · Couldn't convert those values.`),
            Text(`-# ${escapeMarkdown(reason)}`),
          ),
        ),
        ephemeral: true,
        allowedMentions: { parse: [] },
      });
    }
  },
});
