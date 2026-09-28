import InteractionHandler from "@/interaction/Handler";
import { Container, Text, v2 } from "@/utils/ui/components";

export default new InteractionHandler({
  feature: "demo",
  action: "choice",

  async execute(client, interaction) {
    if (!interaction.isSelect()) {
      return;
    }

    const values = interaction.getSelectedValues();

    await interaction.updateMessage(
      v2(new Container().text(Text(`You selected: ${values.join(", ")}`))),
    );
  },
});
