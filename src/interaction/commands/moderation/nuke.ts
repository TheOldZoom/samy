import {
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  ChannelType,
} from "discord.js";
import Command from "@/classes/Command";
import { ActionRow, Buttons, Container, Text, v2 } from "@/utils/ui/components";
import { response } from "@/utils/moderation";
import { icons } from "@/utils/icons";
export default new Command({
  name: "nuke",
  description: "Delete and recreate a text channel.",
  ephemeral: true,
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
  cooldown: 30,
  options: [
    {
      name: "channel",
      description: "Channel to recreate; defaults to this channel.",
      type: ApplicationCommandOptionType.Channel,
      channel_types: [ChannelType.GuildText, ChannelType.GuildAnnouncement],
    },
  ],
  async execute(_client, interaction) {
    if (!interaction.guild) return;
    await interaction.defer();

    const id =
      interaction.getOptionValue(
        "channel",
        ApplicationCommandOptionType.Channel,
      ) ?? interaction.channelId;
    const channel = await interaction.guild.channels
      .fetch(id)
      .catch(() => null);
    if (
      !channel ||
      (channel.type !== ChannelType.GuildText &&
        channel.type !== ChannelType.GuildAnnouncement)
    )
      return await interaction.reply(
        response("Select a text or announcement channel.", true),
      );
    if (
      [
        interaction.guild.rulesChannelId,
        interaction.guild.publicUpdatesChannelId,
        interaction.guild.systemChannelId,
      ].includes(id)
    )
      return await interaction.reply(
        response("Discord-designated server channels cannot be nuked.", true),
      );
    await interaction.reply({
      ...v2(
        new Container()
          .text(
            Text(`-# ${icons.deletechannel} · Channel recreation`),
            Text(
              `### Recreate ${channel}?\nThis permanently deletes its messages and cannot be undone.`,
            ),
          )
          .actionRow(
            ActionRow(
              Buttons.danger(
                "Recreate channel",
                `nuke:confirm:${interaction.user.id}.${id}`,
              ),
              Buttons.secondary("Cancel", `nuke:cancel:${interaction.user.id}`),
            ),
          ),
      ),
      ephemeral: true,
      allowedMentions: { parse: [] },
    });
  },
});
