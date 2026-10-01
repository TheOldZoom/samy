import InteractionHandler from "@/interaction/Handler";
import { findMarriage, partnerId } from "@/utils/marriage";
import { renderMarriageCard } from "@/utils/ui/cards/marriage";
import { Container, Media, Separator, Text, v2 } from "@/utils/ui/components";

export default new InteractionHandler({
  feature: "family",
  action: "marry-cancel",

  async execute(client, interaction, component) {
    if (!interaction.isButton() || !component.id) return;

    const [requesterId, spouseId] = component.id.split(".");
    if (!requesterId || !spouseId) return;
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
    if (!marriage || partnerId(marriage, requesterId) !== spouseId) {
      await interaction.reply({
        ...v2(new Container().text(Text("That marriage no longer exists."))),
        ephemeral: true,
      });
      return;
    }

    const [requester, spouse] = await Promise.all([
      client.users.fetch(requesterId, { force: true }),
      client.users.fetch(spouseId, { force: true }),
    ]);
    const card = await renderMarriageCard(requester, spouse, "cancelled");

    await interaction.updateMessage({
      attachments: [],
      files: [{ name: "marriage.png", attachment: card }],
      ...v2(
        new Container()
          .media(Media("attachment://marriage.png"))
          .text(Text("The divorce was cancelled."))
          .separator(Separator()),
      ),
      allowedMentions: { parse: [] },
    });
  },
});
