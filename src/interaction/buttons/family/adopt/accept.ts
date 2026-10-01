import { escapeMarkdown } from "discord.js";

import InteractionHandler from "@/interaction/Handler";
import prisma from "@/libs/Prisma";
import { adoptionRestrictionReason } from "@/utils/family";
import { icons } from "@/utils/icons";
import { renderAdoptionCard } from "@/utils/ui/cards/adoption";
import { Container, Media, Separator, Text, v2 } from "@/utils/ui/components";
import { cacheDiscordUsers } from "@/utils/userCache";

const privateMessage = (content: string) => ({
  ...v2(new Container().text(Text(content))),
  ephemeral: true,
});

export default new InteractionHandler({
  feature: "family",
  action: "adopt-accept",

  async execute(client, interaction, component) {
    if (!interaction.isButton() || !component.id) return;

    const [parentId, childId] = component.id.split(".");
    if (!parentId || !childId) return;
    if (interaction.user.id !== childId) {
      await interaction.reply(
        privateMessage("Only the person being adopted can accept this."),
      );
      return;
    }

    const [parent, child] = await Promise.all([
      client.users.fetch(parentId, { force: true }),
      client.users.fetch(childId, { force: true }),
    ]);
    if (parent.id === child.id || parent.bot || child.bot) {
      await interaction.reply(
        privateMessage("This adoption proposal is not valid."),
      );
      return;
    }
    const card = await renderAdoptionCard(parent, child, "adopted");
    await cacheDiscordUsers(parent, child);

    try {
      const rejection = await prisma.$transaction(
        async (tx) => {
          const [adoptions, marriages] = await Promise.all([
            tx.adoption.findMany(),
            tx.marriage.findMany({ include: { members: true } }),
          ]);
          const restriction = adoptionRestrictionReason(
            parentId,
            childId,
            adoptions,
            marriages,
          );
          if (restriction) return restriction;

          await tx.adoption.create({ data: { parentId, childId } });
          return null;
        },
        { isolationLevel: "Serializable" },
      );
      if (rejection) {
        await interaction.reply(privateMessage(rejection));
        return;
      }
    } catch {
      await interaction.reply(
        privateMessage("This adoption could not be completed."),
      );
      return;
    }

    const parentName = escapeMarkdown(parent.globalName ?? parent.username);
    const childName = escapeMarkdown(child.globalName ?? child.username);
    await interaction.updateMessage({
      attachments: [],
      files: [{ name: "adoption.png", attachment: card }],
      ...v2(
        new Container()
          .media(Media("attachment://adoption.png"))
          .text(
            Text(
              `-# ${icons.friends} · Adoption complete\n**${childName}** is now **${parentName}**'s child.`,
            ),
          )
          .separator(Separator()),
      ),
      allowedMentions: { parse: [] },
    });
  },
});
