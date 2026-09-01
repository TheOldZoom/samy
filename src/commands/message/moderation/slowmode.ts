import { ChannelType, MessageFlags } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand } from "@/classes/Command";
import { Container, Text } from "@/ui/components";
import { parseDuration } from "@/utils/duration";

export default new MessageCommand({
  name: "slowmode",
  description: "Set the slowmode delay for a channel.",
  category: "Moderation",
  guildOnly: true,
  userPermissions: ["ManageChannels"],
  botPermissions: ["ManageChannels"],

  arguments: [
    {
      name: "duration",
      aliases: ["time", "delay"],
      type: "string",
      description:
        "Slowmode duration (e.g. 10s, 5m, 1h, or 0 to disable). Maximum 6 hours.",
      required: true,
    },
    {
      name: "channel",
      aliases: ["c"],
      type: "channel",
      description: "The channel to change (defaults to this channel).",
      required: false,
    },
  ],

  async execute(client, message, args) {
    if (!message.guild) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.clock + " " + client.i18n.t("commands.slowmode.guild_only"),
            ),
          ),
        ],
      });

      return;
    }

    const channel = args.getChannel("channel") ?? message.channel;

    if (
      !channel ||
      !("setRateLimitPerUser" in channel) ||
      ![
        ChannelType.GuildText,
        ChannelType.GuildAnnouncement,
        ChannelType.GuildForum,
        ChannelType.GuildMedia,
      ].includes(channel.type)
    ) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.clock +
                " " +
                client.i18n.t("commands.slowmode.invalid_channel"),
            ),
          ),
        ],
      });

      return;
    }

    const input = args.getString("duration")?.trim();

    if (!input) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.clock +
                " " +
                client.i18n.t("commands.slowmode.invalid_duration"),
            ),
          ),
        ],
      });

      return;
    }

    const seconds =
      input === "0"
        ? 0
        : parseDuration(input) !== null
          ? Math.floor(parseDuration(input)! / 1000)
          : null;

    if (seconds === null || seconds > 21600) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.clock +
                " " +
                client.i18n.t("commands.slowmode.invalid_duration"),
            ),
          ),
        ],
      });

      return;
    }

    try {
      await channel.setRateLimitPerUser(seconds);

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              client.i18n.t(
                seconds === 0
                  ? "commands.slowmode.disabled"
                  : "commands.slowmode.success",
                {
                  channel: channel.toString(),
                  duration: input,
                },
              ),
            ),
          ),
        ],
      });
    } catch {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(icons.clock + " " + client.i18n.t("commands.slowmode.failed")),
          ),
        ],
      });
    }
  },
});
