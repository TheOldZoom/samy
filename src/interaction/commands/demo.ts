import { ApplicationCommandOptionType } from "@discordjs/core";

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
    await interaction.reply({
      content: "Interaction demo",
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 1,
              label: "Open modal",
              custom_id: "demo:modal",
            },
            {
              type: 2,
              style: 2,
              label: "Choose option",
              custom_id: "demo:select",
            },
          ],
        },
      ],
    });
  },
});
