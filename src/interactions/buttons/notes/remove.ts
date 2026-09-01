import { MessageFlags } from "discord.js";

import { ButtonHandler } from "@/classes/Interaction";
import { renderNotesList } from "@/ui/notes";
import errorUI from "@/ui/error";

export default new ButtonHandler({
  namespace: "notes",
  action: "remove",

  async execute(client, interaction, params, invokerId) {
    const guild = interaction.guild;
    if (!guild) return;

    const noteId = params[0];
    if (!noteId) return;

    const page = Number(params[1] ?? 0);
    const _targetId = params[2];

    const note = await client.prisma.memberNote.findFirst({
      where: { id: noteId, guildId: guild.id },
    });

    if (!note) {
      await interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [errorUI(client.i18n.t("commands.notes.not_found"))],
      });

      return;
    }

    try {
      await client.prisma.memberNote.delete({ where: { id: note.id } });
    } catch {
      await interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [errorUI(client.i18n.t("commands.notes.remove.failed"))],
      });

      return;
    }

    const container = await renderNotesList(
      client,
      guild,
      invokerId,
      page,
      note.userId,
    );

    await interaction.update({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    });
  },
});
