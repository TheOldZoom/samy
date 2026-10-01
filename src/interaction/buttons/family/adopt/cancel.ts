import InteractionHandler from "@/interaction/Handler";
import prisma from "@/libs/Prisma";
import { renderAdoptionCard } from "@/utils/ui/cards/adoption";
import { Container, Media, Separator, Text, v2 } from "@/utils/ui/components";

export default new InteractionHandler({
  feature: "family",
  action: "unadopt-cancel",

  async execute(_client, interaction, component) {
    if (!interaction.isButton() || !component.id) return;

    const [requesterId, parentId, childId] = component.id.split(".");
    if (!requesterId || !parentId || !childId) return;
    if (interaction.user.id !== requesterId) {
      await interaction.reply({
        ...v2(
          new Container().text(
            Text("Only the person who opened this confirmation can use it."),
          ),
        ),
        ephemeral: true,
      });
      return;
    }

    const users = await prisma.user.findMany({
      where: { id: { in: [parentId, childId] } },
    });
    const parent = users.find((user) => user.id === parentId);
    const child = users.find((user) => user.id === childId);
    if (!parent || !child) {
      await interaction.updateMessage(
        v2(new Container().text(Text("The removal was cancelled."))),
      );
      return;
    }

    const card = await renderAdoptionCard(parent, child, "kept");
    await interaction.updateMessage({
      attachments: [],
      files: [{ name: "adoption.png", attachment: card }],
      ...v2(
        new Container()
          .media(Media("attachment://adoption.png"))
          .text(Text("The parent-child relationship was kept."))
          .separator(Separator()),
      ),
      allowedMentions: { parse: [] },
    });
  },
});
