import InteractionHandler from "@/interaction/Handler";
import { response } from "@/utils/moderation";
import { renderCasesList } from "@/utils/moderationLists";
import { v2 } from "@/utils/ui/components";

export default new InteractionHandler({
  feature: "cases",
  action: "page",

  async execute(_client, interaction, component) {
    if (!interaction.isButton() || !interaction.guildId || !component.id) {
      return;
    }

    const [invokerId, pageValue, targetValue] = component.id.split(".");

    if (!invokerId || interaction.user.id !== invokerId) {
      await interaction.reply(
        response(
          "Only the moderator who opened this list can use these buttons.",
          true,
        ),
      );
      return;
    }

    const page = Number(pageValue) || 0;
    const targetId = targetValue === "_" ? undefined : targetValue;
    const container = await renderCasesList(
      interaction.guildId,
      invokerId,
      page,
      targetId,
    );

    await interaction.updateMessage(v2(container));
  },
});
