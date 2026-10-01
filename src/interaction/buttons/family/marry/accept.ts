import { escapeMarkdown } from "discord.js";

import InteractionHandler from "@/interaction/Handler";
import prisma from "@/libs/Prisma";
import { marriageRestrictionReason } from "@/utils/family";
import { icons } from "@/utils/icons";
import { renderMarriageCard } from "@/utils/ui/cards/marriage";
import { Container, Media, Separator, Text, v2 } from "@/utils/ui/components";
import { cacheDiscordUsers } from "@/utils/userCache";

const privateMessage = (content: string) => ({
  ...v2(new Container().text(Text(content))),
  ephemeral: true,
});

export default new InteractionHandler({
  feature: "family",
  action: "marry-accept",

  async execute(client, interaction, component) {
    if (!interaction.isButton() || !component.id) return;

    const [proposerId, recipientId] = component.id.split(".");
    if (!proposerId || !recipientId) return;
    if (interaction.user.id !== recipientId) {
      await interaction.reply(
        privateMessage(
          "Only the person receiving this proposal can accept it.",
        ),
      );
      return;
    }

    const [proposer, recipient] = await Promise.all([
      client.users.fetch(proposerId, { force: true }),
      client.users.fetch(recipientId, { force: true }),
    ]);
    if (proposer.id === recipient.id || proposer.bot || recipient.bot) {
      await interaction.reply(
        privateMessage("This marriage proposal is not valid."),
      );
      return;
    }
    const card = await renderMarriageCard(proposer, recipient, "married");
    await cacheDiscordUsers(proposer, recipient);

    try {
      const rejection = await prisma.$transaction(
        async (tx) => {
          const occupied = await tx.marriageMember.count({
            where: { userId: { in: [proposerId, recipientId] } },
          });
          if (occupied > 0) return "One of you is already married.";

          const [adoptions, marriages] = await Promise.all([
            tx.adoption.findMany(),
            tx.marriage.findMany({ include: { members: true } }),
          ]);
          const restriction = marriageRestrictionReason(
            proposerId,
            recipientId,
            adoptions,
            marriages,
          );
          if (restriction) return restriction;

          await tx.marriage.create({
            data: {
              members: {
                create: [{ userId: proposerId }, { userId: recipientId }],
              },
            },
          });
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
        privateMessage(
          "This proposal could not be accepted because the family changed.",
        ),
      );
      return;
    }
    const proposerName = escapeMarkdown(
      proposer.globalName ?? proposer.username,
    );
    const recipientName = escapeMarkdown(
      recipient.globalName ?? recipient.username,
    );

    await interaction.updateMessage({
      attachments: [],
      files: [{ name: "marriage.png", attachment: card }],
      ...v2(
        new Container()
          .media(Media("attachment://marriage.png"))
          .text(
            Text(
              `-# ${icons.heart} · Just married\n**${proposerName}** and **${recipientName}** are now married!`,
            ),
          )
          .separator(Separator()),
      ),
      allowedMentions: { parse: [] },
    });
  },
});
