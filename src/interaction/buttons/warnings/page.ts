import InteractionHandler from "@/interaction/Handler";
import { response } from "@/utils/moderation";
import { renderWarningsList } from "@/utils/moderationLists";
import { v2 } from "@/utils/ui/components";

export default new InteractionHandler({
  feature: "warnings",
  action: "page",

  async execute(_client, interaction, component) {
    if (!interaction.isButton() || !interaction.guildId || !component.id)
      return;

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

    const container = await renderWarningsList(
      interaction.guildId,
      invokerId,
      Number(pageValue) || 0,
      targetValue === "_" ? undefined : targetValue,
    );
    await interaction.updateMessage(v2(container));
  },
});
