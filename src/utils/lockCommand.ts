import {
  ApplicationCommandOptionType,
  ChannelType,
  PermissionFlagsBits,
} from "discord.js";
import Command from "@/classes/Command";
import { icons } from "@/utils/icons";
import { DEFAULT_REASON, response } from "@/utils/moderation";
import { Container, Text, v2 } from "@/utils/ui/components";

const types: [
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
  ChannelType.GuildForum,
  ChannelType.GuildMedia,
] = [
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
  ChannelType.GuildForum,
  ChannelType.GuildMedia,
];

const LOCKED = {
  SendMessages: false,
  SendMessagesInThreads: false,
  AddReactions: false,
  CreatePublicThreads: false,
  CreatePrivateThreads: false,
};

const UNLOCKED = {
  SendMessages: null,
  SendMessagesInThreads: null,
  AddReactions: null,
  CreatePublicThreads: null,
  CreatePrivateThreads: null,
};

export function lockCommand(kind: "lock" | "unlock") {
  const locking = kind === "lock";

  return new Command({
    name: kind,
    description: locking
      ? "Stop a role from sending messages in a channel."
      : "Let a role send messages in a channel again.",
    ephemeral: true,
    defaultMemberPermissions: PermissionFlagsBits.ManageChannels,
    options: [
      {
        name: "channel",
        description: "Channel; defaults to this channel.",
        type: ApplicationCommandOptionType.Channel,
        channel_types: types,
      },
      {
        name: "role",
        description: "Role to affect; defaults to @everyone.",
        type: ApplicationCommandOptionType.Role,
      },
      {
        name: "reason",
        description: `Reason for the ${kind}.`,
        type: ApplicationCommandOptionType.String,
      },
    ],
    async execute(_client, interaction) {
      if (!interaction.guild) return;
      await interaction.defer();

      const channel = await interaction.guild.channels
        .fetch(
          interaction.getOptionValue(
            "channel",
            ApplicationCommandOptionType.Channel,
          ) ?? interaction.channelId,
        )
        .catch(() => null);
      if (!channel || !("permissionOverwrites" in channel))
        return await interaction.reply(
          response(`That channel cannot be ${kind}ed.`, true),
        );

      const roleId =
        interaction.getOptionValue("role", ApplicationCommandOptionType.Role) ??
        interaction.guild.roles.everyone.id;
      const roleLabel =
        roleId === interaction.guild.id ? "@everyone" : `<@&${roleId}>`;
      const reasonInput = interaction.getOptionValue(
        "reason",
        ApplicationCommandOptionType.String,
      );
      const reason = reasonInput ?? DEFAULT_REASON;

      const alreadyLocked =
        channel.permissionOverwrites.cache
          .get(roleId)
          ?.deny.has(PermissionFlagsBits.SendMessages) ?? false;

      if (locking === alreadyLocked)
        return await interaction.reply(
          response(
            `${channel} is already ${locking ? "locked" : "unlocked"} for ${roleLabel}.`,
            true,
          ),
        );

      try {
        await channel.permissionOverwrites.edit(
          roleId,
          locking ? LOCKED : UNLOCKED,
          { reason: `${interaction.user.tag}: ${reason}` },
        );
      } catch {
        return await interaction.reply(
          response(
            "I could not edit that channel's permissions. Check that I can manage it.",
            true,
          ),
        );
      }

      if (channel.isTextBased() && "send" in channel)
        await channel
          .send({
            ...v2(
              new Container().text(
                Text(
                  `-# ${locking ? icons.locked : icons.unlock} · Channel ${kind}ed`,
                ),
                Text(
                  `${locking ? `${roleLabel} can no longer send messages here.` : `${roleLabel} can send messages here again.`}${reasonInput ? `\nReason: ${reasonInput}` : ""}`,
                ),
              ),
            ),
            allowedMentions: { parse: [] },
          })
          .catch(() => null);

      await interaction.reply(
        response(
          `${locking ? "Locked" : "Unlocked"} ${channel} for ${roleLabel}.\nReason: ${reason}`,
        ),
      );
    },
  });
}
