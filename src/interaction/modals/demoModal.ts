import InteractionHandler from "@/interaction/Handler";

export default new InteractionHandler({
  feature: "demo",
  action: "submit",

  async execute(client, interaction) {
    if (!interaction.isModal()) {
      return;
    }

    const message = interaction.getModalValue("message");

    await interaction.reply({
      content: `You submitted: ${message ?? "nothing"}`,
      ephemeral: true,
    });
  },
});
