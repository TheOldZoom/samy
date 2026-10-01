import { escapeMarkdown } from "discord.js";

import InteractionHandler from "@/interaction/Handler";
import { renderMarriageCard } from "@/utils/ui/cards/marriage";
import { Container, Media, Separator, Text, v2 } from "@/utils/ui/components";

export default new InteractionHandler({
  feature: "family",
  action: "marry-decline",

  async execute(client, interaction, component) {
    if (!interaction.isButton() || !component.id) return;

    const [proposerId, recipientId] = component.id.split(".");
    if (!proposerId || !recipientId) return;
    if (interaction.user.id !== recipientId) {
      await interaction.reply({
        ...v2(
          new Container().text(
            Text("Only the person receiving this proposal can decline it."),
          ),
        ),
        ephemeral: true,
      });
      return;
    }

    const [proposer, recipient] = await Promise.all([
      client.users.fetch(proposerId, { force: true }),
      client.users.fetch(recipientId, { force: true }),
    ]);
    const card = await renderMarriageCard(proposer, recipient, "declined");
    const recipientName = escapeMarkdown(
      recipient.globalName ?? recipient.username,
    );

    await interaction.updateMessage({
      attachments: [],
      files: [{ name: "marriage.png", attachment: card }],
      ...v2(
        new Container()
          .media(Media("attachment://marriage.png"))
          .text(Text(`-# × · Proposal declined\n**${recipientName}** said no.`))
          .separator(Separator()),
      ),
      allowedMentions: { parse: [] },
    });
  },
});
