import {
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  ChannelType,
} from "discord.js";
import Command from "@/classes/Command";
import { parseDuration, msToHuman } from "@/utils/duration";
import { response } from "@/utils/moderation";
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
export default new Command({
  name: "slowmode",
  description: "Set a channel's slowmode delay.",
  ephemeral: true,
  defaultMemberPermissions: PermissionFlagsBits.ManageChannels,
  options: [
    {
      name: "duration",
      description: "Duration up to 6h, or 0 to disable.",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: "channel",
      description: "Channel; defaults to this channel.",
      type: ApplicationCommandOptionType.Channel,
      channel_types: types,
    },
  ],
  async execute(_client, interaction) {
    if (!interaction.guild) return;
    await interaction.defer();

    const raw = interaction.getOptionValue(
      "duration",
      ApplicationCommandOptionType.String,
    )!;
    const ms = raw.trim() === "0" ? 0 : parseDuration(raw);
    if (ms === null || ms > 21_600_000)
      return await interaction.reply(
        response("Enter a duration up to 6 hours, or 0 to disable.", true),
      );
    const channel = await interaction.guild.channels
      .fetch(
        interaction.getOptionValue(
          "channel",
          ApplicationCommandOptionType.Channel,
        ) ?? interaction.channelId,
      )
      .catch(() => null);
    if (!channel || !("setRateLimitPerUser" in channel))
      return await interaction.reply(
        response("That channel does not support slowmode.", true),
      );
    await channel.setRateLimitPerUser(Math.floor(ms / 1000));
    await interaction.reply(
      response(
        ms
          ? `Set slowmode in ${channel} to **${msToHuman(ms)}**.`
          : `Disabled slowmode in ${channel}.`,
      ),
    );
  },
});
