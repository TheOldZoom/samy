import InteractionHandler from "@/interaction/Handler";

export default new InteractionHandler({
  feature: "demo",
  action: "choice",

  async execute(client, interaction) {
    if (!interaction.isSelect()) {
      return;
    }

    const values = interaction.getSelectedValues();

    await interaction.updateMessage({
      content: `You selected: ${values.join(", ")}`,
      components: [],
    });
  },
});
