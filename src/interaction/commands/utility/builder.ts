import { ApplicationCommandOptionType } from "discord.js";

import Command from "@/classes/Command";
import {
  buildScriptMessage,
  getVariableSource,
  replaceVariables,
  scheduleMessageDeletion,
} from "@/libs/scripting";

export default new Command({
  name: "builder",
  description: "Build and send a text, embed, or Components V2 message.",
  options: [
    {
      name: "message",
      description: "Plain text, an {embed} script, or a {cv2} script.",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ],
  everywhere: true,
  ephemeral: true,

  async execute(client, interaction) {
    const raw = interaction
      .getOptionValue("message", ApplicationCommandOptionType.String)
      ?.trim();

    if (!raw) {
      await interaction.reply({
        content: "Missing message content.",
        allowedMentions: { parse: [] },
      });
      return;
    }

    const source = await getVariableSource(client, interaction, raw);
    const built = buildScriptMessage(replaceVariables(raw, source));

    if (!built.success) {
      await interaction.reply({
        content: built.error,
        allowedMentions: { parse: [] },
      });
      return;
    }

    await interaction.reply({
      ...(built.message.body as Record<string, unknown>),
      allowedMentions: { parse: [] },
    });

    scheduleMessageDeletion(
      () => interaction.deleteReply(),
      built.message.deleteMs,
    );
  },
});
