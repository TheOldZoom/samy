import InteractionHandler from "@/interaction/Handler";
import prisma from "@/libs/Prisma";
import { response } from "@/utils/moderation";
import { renderNotesList } from "@/utils/moderationLists";
import { v2 } from "@/utils/ui/components";

export default new InteractionHandler({
  feature: "notes",
  action: "remove",
  async execute(_client, interaction, component) {
    if (!interaction.isButton() || !interaction.guildId || !component.id)
      return;
    const [invokerId, noteId, pageValue, targetValue] = component.id.split(".");
    if (!invokerId || interaction.user.id !== invokerId) {
      await interaction.reply(
        response(
          "Only the moderator who opened this list can use these buttons.",
          true,
        ),
      );
      return;
    }
    if (!noteId) return;
    const note = await prisma.memberNote.findFirst({
      where: { id: noteId, guildId: interaction.guildId },
    });
    if (!note) {
      await interaction.reply(response("That note no longer exists.", true));
      return;
    }
    await prisma.memberNote.delete({ where: { id: note.id } });
    const targetId = targetValue === "_" ? undefined : targetValue;
    const container = await renderNotesList(
      interaction.guildId,
      invokerId,
      Number(pageValue) || 0,
      targetId,
    );
    await interaction.updateMessage(v2(container));
  },
});
