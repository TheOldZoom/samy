import InteractionHandler from "@/interaction/Handler";
import {
  ActionRow,
  Container,
  SelectMenu,
  Text,
  v2,
} from "@/utils/ui/components";

export default new InteractionHandler({
  feature: "demo",
  action: "select",

  async execute(_client, interaction) {
    await interaction.updateMessage(
      v2(
        new Container().text(Text("### Choose an option")).actionRow(
          ActionRow(
            SelectMenu({
              customId: "demo:choice",
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
            }),
          ),
        ),
      ),
    );
  },
});
