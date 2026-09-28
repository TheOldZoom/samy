import { ApplicationCommandOptionType } from "@discordjs/core";
import {
  ActionRow,
  Buttons,
  Container,
  Separator,
  Text,
  v2,
} from "@/utils/ui/components";
import Command from "@/classes/Command";

export default new Command({
  name: "demo",
  description: "Test the interaction system.",

  options: [
    {
      name: "search",
      description: "Search for something",
      type: ApplicationCommandOptionType.String,
      autocomplete: true,
      required: false,
    },
  ],

  autocomplete: async (client, interaction) => {
    const query = interaction.getOptionValue(
      "search",
      ApplicationCommandOptionType.String,
    );

    const results = [
      "Kanye West",
      "Don Toliver",
      "Yeat",
      "Radiohead",
      "Frank Ocean",
      "Gorillaz",
      "Clairo",
      "TV Girl",
    ];

    const filtered = results
      .filter((item) =>
        item.toLowerCase().includes((query ?? "").toLowerCase()),
      )
      .slice(0, 25);

    await interaction.autocomplete({
      choices: filtered.map((name) => ({
        name,
        value: name,
      })),
    });
  },

  async execute(client, interaction) {
    await interaction.reply(
      v2(
        new Container()
          .text(Text("## Interaction demo"), Text("Try the buttons below."))
          .separator(Separator())
          .actionRow(
            ActionRow(
              Buttons.primary("Open modal", "demo:modal"),
              Buttons.secondary("Choose option", "demo:select"),
            ),
          ),
      ),
    );
  },
});
