import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  InteractionType,
} from "@discordjs/core";

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
    if (
      interaction.type !== InteractionType.ApplicationCommand ||
      interaction.data.type !== ApplicationCommandType.ChatInput
    ) {
      return;
    }

    const raw = interaction
      .getOptionValue("message", ApplicationCommandOptionType.String)
      ?.trim();

    if (!raw) {
      await interaction.reply({
        content: "Missing message content.",
        ephemeral: true,
        allowed_mentions: { parse: [] },
      });
      return;
    }

    const source = await getVariableSource(client.api, interaction, raw);
    const built = buildScriptMessage(replaceVariables(raw, source));

    if (!built.success) {
      await interaction.reply({
        content: built.error,
        ephemeral: true,
        allowed_mentions: { parse: [] },
      });
      return;
    }

    await interaction.reply({
      ...built.message.body,
      ephemeral: true,
      allowed_mentions: { parse: [] },
    });

    scheduleMessageDeletion(
      () => interaction.deleteReply(),
      built.message.deleteMs,
    );
  },
});
