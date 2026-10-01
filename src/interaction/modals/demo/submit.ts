import InteractionHandler from "@/interaction/Handler";
import { Container, Text, v2 } from "@/utils/ui/components";

export default new InteractionHandler({
  feature: "demo",
  action: "submit",

  async execute(_client, interaction) {
    if (!interaction.isModal()) {
      return;
    }

    const message = interaction.getModalValue("message");

    await interaction.reply({
      ...v2(
        new Container().text(Text(`You submitted: ${message ?? "nothing"}`)),
      ),
      ephemeral: true,
    });
  },
});
