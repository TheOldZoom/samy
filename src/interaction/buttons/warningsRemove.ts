import InteractionHandler from "@/interaction/Handler";
import prisma from "@/libs/Prisma";
import { response } from "@/utils/moderation";
import { renderWarningsList } from "@/utils/moderationLists";
import { v2 } from "@/utils/ui/components";

export default new InteractionHandler({
  feature: "warnings",
  action: "remove",
  async execute(_client, interaction, component) {
    if (!interaction.isButton() || !interaction.guildId || !component.id)
      return;
    const [invokerId, warningId, pageValue, targetValue] =
      component.id.split(".");
    if (!invokerId || interaction.user.id !== invokerId) {
      await interaction.reply(
        response(
          "Only the moderator who opened this list can use these buttons.",
          true,
        ),
      );
      return;
    }
    if (!warningId) return;
    const warning = await prisma.warning.findFirst({
      where: { id: warningId, guildId: interaction.guildId },
    });
    if (!warning) {
      await interaction.reply(response("That warning no longer exists.", true));
      return;
    }
    await prisma.warning.delete({ where: { id: warning.id } });
    const targetId = targetValue === "_" ? undefined : targetValue;
    const container = await renderWarningsList(
      interaction.guildId,
      invokerId,
      Number(pageValue) || 0,
      targetId,
    );
    await interaction.updateMessage(v2(container));
  },
});
