import InteractionHandler from "@/interaction/Handler";

export default new InteractionHandler({
  feature: "demo",
  action: "select",

  async execute(client, interaction) {
    await interaction.updateMessage({
      content: "Choose an option:",
      components: [
        {
          type: 1,
          components: [
            {
              type: 3,
              custom_id: "demo:choice",
              placeholder: "Select something",
              options: [
                {
                  label: "Kanye West",
                  value: "kanye",
                  description: "Artist",
                },
                {
                  label: "Don Toliver",
                  value: "don-toliver",
                  description: "Artist",
                },
                {
                  label: "Yeat",
                  value: "yeat",
                  description: "Artist",
                },
              ],
            },
          ],
        },
      ],
    });
  },
});
