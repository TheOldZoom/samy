import { escapeMarkdown } from "discord.js";

import InteractionHandler from "@/interaction/Handler";
import prisma from "@/libs/Prisma";
import { icons } from "@/utils/icons";
import { renderAdoptionCard } from "@/utils/ui/cards/adoption";
import { Container, Media, Separator, Text, v2 } from "@/utils/ui/components";

const privateMessage = (content: string) => ({
  ...v2(new Container().text(Text(content))),
  ephemeral: true,
});

export default new InteractionHandler({
  feature: "family",
  action: "unadopt-confirm",

  async execute(_client, interaction, component) {
    if (!interaction.isButton() || !component.id) return;

    const [requesterId, parentId, childId] = component.id.split(".");
    if (!requesterId || !parentId || !childId) return;
    if (
      interaction.user.id !== requesterId ||
      (requesterId !== parentId && requesterId !== childId)
    ) {
      await interaction.reply(
        privateMessage(
          "Only the person who opened this confirmation can use it.",
        ),
      );
      return;
    }

    const relationship = await prisma.adoption.findUnique({
      where: { parentId_childId: { parentId, childId } },
      include: { parent: true, child: true },
    });
    if (!relationship) {
      await interaction.reply(
        privateMessage("That parent-child relationship no longer exists."),
      );
      return;
    }

    await prisma.adoption.delete({
      where: { parentId_childId: { parentId, childId } },
    });
    const card = await renderAdoptionCard(
      relationship.parent,
      relationship.child,
      "removed",
    );
    const parentName = escapeMarkdown(relationship.parent.username);
    const childName = escapeMarkdown(relationship.child.username);

    await interaction.updateMessage({
      attachments: [],
      files: [{ name: "adoption.png", attachment: card }],
      ...v2(
        new Container()
          .media(Media("attachment://adoption.png"))
          .text(
            Text(
              `-# ${icons.friends} · Family updated\n**${parentName}** is no longer **${childName}**'s parent.`,
            ),
          )
          .separator(Separator()),
      ),
      allowedMentions: { parse: [] },
    });
  },
});
