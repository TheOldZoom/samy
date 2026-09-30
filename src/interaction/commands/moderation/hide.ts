import {
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  ChannelType,
} from "discord.js";
import Command from "@/classes/Command";
import { response } from "@/utils/moderation";
export default new Command({
  name: "hide",
  description: "Hide or unhide a channel for a role or member.",
  ephemeral: true,
  defaultMemberPermissions: PermissionFlagsBits.ManageChannels,
  options: [
    {
      name: "target",
      description: "Role or member; defaults to everyone.",
      type: ApplicationCommandOptionType.Mentionable,
    },
    {
      name: "channel",
      description: "Channel; defaults to this channel.",
      type: ApplicationCommandOptionType.Channel,
    },
    {
      name: "state",
      description: "Visibility change.",
      type: ApplicationCommandOptionType.String,
      choices: [
        { name: "Hide", value: "hide" },
        { name: "Unhide", value: "unhide" },
        { name: "Toggle", value: "toggle" },
      ],
    },
  ],
  async execute(_client, interaction) {
    if (!interaction.guild) return;
    await interaction.defer();

    const cid =
      interaction.getOptionValue(
        "channel",
        ApplicationCommandOptionType.Channel,
      ) ?? interaction.channelId;
    const channel = await interaction.guild.channels
      .fetch(cid)
      .catch(() => null);
    if (
      !channel ||
      channel.type === ChannelType.GuildCategory ||
      !("permissionOverwrites" in channel)
    )
      return await interaction.reply(
        response("That channel cannot be hidden.", true),
      );
    const target =
      interaction.getOptionValue(
        "target",
        ApplicationCommandOptionType.Mentionable,
      ) ?? interaction.guild.roles.everyone.id;
    const state =
      interaction.getOptionValue(
        "state",
        ApplicationCommandOptionType.String,
      ) ?? "toggle";
    const denied =
      channel.permissionOverwrites.cache
        .get(target)
        ?.deny.has(PermissionFlagsBits.ViewChannel) ?? false;
    const hide = state === "hide" || (state === "toggle" && !denied);
    await channel.permissionOverwrites.edit(target, {
      ViewChannel: hide ? false : null,
    });
    await interaction.reply(
      response(
        `${channel} is now **${hide ? "hidden" : "visible"}** for <@&${target}>.`,
      ),
    );
  },
});
