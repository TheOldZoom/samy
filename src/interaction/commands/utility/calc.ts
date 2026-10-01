import { ApplicationCommandOptionType, escapeMarkdown } from "discord.js";
import Command from "@/classes/Command";
import { calculate, formatCalculation } from "@/utils/calculator";
import { icons } from "@/utils/icons";
import { Container, Text, v2 } from "@/utils/ui/components";

export default new Command({
  name: "calc",
  description: "Calculate a mathematical expression",
  everywhere: true,
  ephemeral: true,
  options: [
    {
      name: "expression",
      description: "For example: sqrt(144) + 2^3",
      type: ApplicationCommandOptionType.String,
      required: true,
      max_length: 200,
    },
  ],

  async execute(_client, interaction) {
    const expression = interaction.getOptionValue(
      "expression",
      ApplicationCommandOptionType.String,
    )!;

    try {
      const result = calculate(expression);

      await interaction.reply({
        ...v2(
          new Container().text(
            Text(`-# ${icons.code} · Calculator`),
            Text(
              `**\`${escapeMarkdown(expression)}\`\n\`\`\`${escapeMarkdown(formatCalculation(result))}\`\`\`**`,
            ),
          ),
        ),
        allowedMentions: { parse: [] },
      });
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "Invalid expression";
      await interaction.reply({
        ...v2(
          new Container().text(
            Text(`${icons.Wrong} · Couldn't calculate that expression.`),
            Text(`-# ${escapeMarkdown(reason)}`),
          ),
        ),
        ephemeral: true,
        allowedMentions: { parse: [] },
      });
    }
  },
});
