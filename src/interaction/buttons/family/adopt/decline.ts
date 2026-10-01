import { escapeMarkdown } from "discord.js";

import InteractionHandler from "@/interaction/Handler";
import { renderAdoptionCard } from "@/utils/ui/cards/adoption";
import { Container, Media, Separator, Text, v2 } from "@/utils/ui/components";

export default new InteractionHandler({
  feature: "family",
  action: "adopt-decline",

  async execute(client, interaction, component) {
    if (!interaction.isButton() || !component.id) return;

    const [parentId, childId] = component.id.split(".");
    if (!parentId || !childId) return;
    if (interaction.user.id !== childId) {
      await interaction.reply({
        ...v2(
          new Container().text(
            Text("Only the person being adopted can decline this."),
          ),
        ),
        ephemeral: true,
      });
      return;
    }

    const [parent, child] = await Promise.all([
      client.users.fetch(parentId, { force: true }),
      client.users.fetch(childId, { force: true }),
    ]);
    const card = await renderAdoptionCard(parent, child, "declined");
    const childName = escapeMarkdown(child.globalName ?? child.username);

    await interaction.updateMessage({
      attachments: [],
      files: [{ name: "adoption.png", attachment: card }],
      ...v2(
        new Container()
          .media(Media("attachment://adoption.png"))
          .text(Text(`-# × · Adoption declined\n**${childName}** said no.`))
          .separator(Separator()),
      ),
      allowedMentions: { parse: [] },
    });
  },
});
