import InteractionHandler from "@/interaction/Handler";

export default new InteractionHandler({
  feature: "demo",
  action: "modal",

  async execute(_client, interaction) {
    if (!interaction.isButton()) {
      return;
    }

    await interaction.showModal({
      custom_id: "demo:submit",
      title: "Demo Modal",
      components: [
        {
          type: 1,
          components: [
            {
              type: 4,
              custom_id: "message",
              label: "Message",
              style: 1,
              placeholder: "Type something...",
              required: true,
              min_length: 1,
              max_length: 100,
            },
          ],
        },
      ],
    });
  },
});
