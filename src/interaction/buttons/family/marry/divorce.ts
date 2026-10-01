import { escapeMarkdown } from "discord.js";

import InteractionHandler from "@/interaction/Handler";
import prisma from "@/libs/Prisma";
import { findMarriage, partnerId } from "@/utils/marriage";
import { renderMarriageCard } from "@/utils/ui/cards/marriage";
import { Container, Media, Separator, Text, v2 } from "@/utils/ui/components";

export default new InteractionHandler({
  feature: "family",
  action: "marry-divorce",

  async execute(client, interaction, component) {
    if (!interaction.isButton() || !component.id) return;

    const [requesterId, expectedSpouseId] = component.id.split(".");
    if (!requesterId || !expectedSpouseId) return;
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

    const marriage = await findMarriage(requesterId);
    if (!marriage || partnerId(marriage, requesterId) !== expectedSpouseId) {
      await interaction.reply({
        ...v2(new Container().text(Text("That marriage no longer exists."))),
        ephemeral: true,
      });
      return;
    }

    const [requester, spouse] = await Promise.all([
      client.users.fetch(requesterId, { force: true }),
      client.users.fetch(expectedSpouseId, { force: true }),
    ]);
    await prisma.marriage.delete({ where: { id: marriage.id } });

    const card = await renderMarriageCard(requester, spouse, "divorced");
    const requesterName = escapeMarkdown(
      requester.globalName ?? requester.username,
    );
    const spouseName = escapeMarkdown(spouse.globalName ?? spouse.username);

    await interaction.updateMessage({
      attachments: [],
      files: [{ name: "marriage.png", attachment: card }],
      ...v2(
        new Container()
          .media(Media("attachment://marriage.png"))
          .text(
            Text(
              `-# × · Marriage ended\n**${requesterName}** and **${spouseName}** are no longer married.`,
            ),
          )
          .separator(Separator()),
      ),
      allowedMentions: { parse: [] },
    });
  },
});
