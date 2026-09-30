import {
  ApplicationCommandOptionType,
  ChannelType,
  DiscordAPIError,
  PermissionFlagsBits,
} from "discord.js";

import Command from "@/classes/Command";
import type { Interaction } from "@/classes/Interaction";
import {
  buildScriptMessage,
  getVariableSource,
  replaceVariables,
  scheduleMessageDeletion,
  type ScriptMessageKind,
} from "@/libs/scripting";

const CONFIRMATION: Record<ScriptMessageKind, string> = {
  text: "Message sent.",
  embed: "Embed sent.",
  "multi-embed": "Multi-embed sent.",
  cv2: "CV2 message sent.",
};

const NO_ACCESS_CODES = new Set<number | string>([50001, 50013]);

function fail(interaction: Interaction, content: string) {
  const data = {
    content,
    ephemeral: true,
    allowedMentions: { parse: [] },
  } as const;

  return interaction.reply(data);
}

export default new Command({
  name: "say",
  description: "Send a message as the bot to a channel.",
  ephemeral: true,
  options: [
    {
      name: "message",
      description: "Plain text, or an {embed}/{cv2} script.",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: "channel",
      description: "Where to send the message (defaults to this channel).",
      type: ApplicationCommandOptionType.Channel,
      channel_types: [ChannelType.GuildText],
      required: false,
    },
  ],
  defaultMemberPermissions: PermissionFlagsBits.ManageMessages,

  async execute(client, interaction) {
    const body = interaction
      .getOptionValue("message", ApplicationCommandOptionType.String)
      ?.trim();

    if (!body) {
      await fail(interaction, "Missing message content.");
      return;
    }

    const channelId = interaction.getOptionValue(
      "channel",
      ApplicationCommandOptionType.Channel,
    );
    const target = channelId
      ? await client.channels.fetch(channelId).catch(() => null)
      : interaction.channel;

    if (
      !target ||
      target.type !== ChannelType.GuildText ||
      !("send" in target)
    ) {
      await fail(interaction, "Invalid channel.");
      return;
    }

    await interaction.defer(true);

    const source = await getVariableSource(client, interaction, body);
    const built = buildScriptMessage(replaceVariables(body, source));

    if (!built.success) {
      await fail(interaction, built.error);
      return;
    }

    const { kind, body: message, deleteMs } = built.message;

    let sent;

    try {
      sent = await target.send(message as never);
    } catch (error) {
      if (error instanceof DiscordAPIError && NO_ACCESS_CODES.has(error.code)) {
        await fail(
          interaction,
          "I don't have permission to send messages in that channel.",
        );
        return;
      }

      throw error;
    }

    scheduleMessageDeletion(() => sent.delete(), deleteMs);

    await interaction.reply({
      content: CONFIRMATION[kind],
      allowedMentions: { parse: [] },
    });
  },
});
