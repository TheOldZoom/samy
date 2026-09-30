import { PermissionFlagsBits } from "discord.js";

import Command, { Subcommand, SubcommandGroup } from "@/classes/Command";
import leaver from "@/interaction/config/leaver";
import welcomer from "@/interaction/config/welcomer";
import {
  getMentionLinksEnabled,
  setMentionLinksEnabled,
} from "@/libs/GuildConfig";
import { Container, Text, v2 } from "@/utils/ui/components";
import {
  imuteConfig,
  jailConfig,
  lockdownConfig,
  rmuteConfig,
} from "@/interaction/config/moderation";

function response(content: string) {
  return {
    ...v2(new Container().text(Text(content))),
    ephemeral: true,
    allowedMentions: { parse: [] },
  };
}

const mentionLinks = new SubcommandGroup({
  name: "mention-links",
  description: "Configure link previews triggered by mentioning the bot.",
  subcommands: [
    new Subcommand({
      name: "enable",
      description: "Enable mention-triggered link previews.",
      async execute(_client, interaction) {
        if (!interaction.guildId) return;
        await interaction.defer(true);

        await setMentionLinksEnabled(interaction.guildId, true);
        await interaction.reply(
          response("Mention-triggered link previews are now enabled."),
        );
      },
    }),
    new Subcommand({
      name: "disable",
      description: "Disable mention-triggered link previews.",
      async execute(_client, interaction) {
        if (!interaction.guildId) return;
        await interaction.defer(true);

        await setMentionLinksEnabled(interaction.guildId, false);
        await interaction.reply(
          response("Mention-triggered link previews are now disabled."),
        );
      },
    }),
    new Subcommand({
      name: "status",
      description: "Show whether mention-triggered link previews are enabled.",
      async execute(_client, interaction) {
        if (!interaction.guildId) return;
        await interaction.defer(true);

        const enabled = await getMentionLinksEnabled(interaction.guildId);

        await interaction.reply(
          response(
            `Mention-triggered link previews are currently **${enabled ? "enabled" : "disabled"}**.`,
          ),
        );
      },
    }),
  ],
});

export default new Command({
  name: "config",
  description: "Configure this server.",
  defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
  subcommandGroups: [
    new SubcommandGroup({
      name: "welcomer",
      description: "Configure welcome messages.",
      subcommands: [...welcomer.subcommands.values()],
    }),
    new SubcommandGroup({
      name: "leaver",
      description: "Configure leave messages.",
      subcommands: [...leaver.subcommands.values()],
    }),
    mentionLinks,
    imuteConfig,
    rmuteConfig,
    jailConfig,
    lockdownConfig,
  ],
});
