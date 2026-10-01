import { ApplicationCommandOptionType, escapeMarkdown } from "discord.js";

import Command from "@/classes/Command";
import { setAfkStatus } from "@/utils/afk";
import { icons } from "@/utils/icons";
import { Container, Text, v2 } from "@/utils/ui/components";

export default new Command({
  name: "afk",
  description: "Set your AFK status for this server",
  ephemeral: true,
  options: [
    {
      name: "reason",
      description: "Why you're away",
      type: ApplicationCommandOptionType.String,
      max_length: 200,
    },
  ],
  async execute(_client, interaction) {
    if (!interaction.guildId) return;
    await interaction.defer();
    const reason = interaction.getOptionValue(
      "reason",
      ApplicationCommandOptionType.String,
    );
    await setAfkStatus(interaction.guildId, interaction.user, reason);

    await interaction.reply({
      ...v2(
        new Container().text(
          Text(`-# ${icons.busy} · AFK status set`),
          Text(
            reason
              ? `You're now AFK in this server · ${escapeMarkdown(reason)}`
              : "You're now AFK in this server.",
          ),
        ),
      ),
      allowedMentions: { parse: [] },
    });
  },
});
