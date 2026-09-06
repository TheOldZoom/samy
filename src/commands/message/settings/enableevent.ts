import { MessageFlags, ChannelType } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand, MessageSubcommand } from "@/classes/Command";
import { Container, Text } from "@/ui/components";

import { BOT_EVENTS, setBotEventEnabled } from "@/utils/botEvents";

export default new MessageCommand({
  name: "enableevent",
  description: "Enable a bot event in this server or channel.",
  category: "Settings",
  guildOnly: true,
  userPermissions: ["ManageChannels"],

  arguments: [
    {
      name: "channel",
      type: "channel",
      description: "The channel to enable the event in.",
      required: true,
    },
    {
      name: "event",
      type: "string",
      description: "The event to enable.",
      required: true,
    },
  ],

  async execute(client, message, args) {
    const channel = args.getChannel("channel");
    const rawEvent = args.getString("event");

    if (!channel || channel.type !== ChannelType.GuildText) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              "Usage: `,enableevent <channel> <event>`\nEvents: " +
                BOT_EVENTS.map((e) => `\`${e}\``).join(", "),
            ),
          ),
        ],
      });

      return;
    }

    if (!rawEvent) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              "Usage: `,enableevent <channel> <event>`\nEvents: " +
                BOT_EVENTS.map((e) => `\`${e}\``).join(", "),
            ),
          ),
        ],
      });

      return;
    }

    const normalizedEvent = rawEvent
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    if (!BOT_EVENTS.some((e) => e === normalizedEvent)) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.Wrong +
                " Unknown event. Available: " +
                BOT_EVENTS.map((e) => `\`${e}\``).join(", "),
            ),
          ),
        ],
      });

      return;
    }

    await setBotEventEnabled(
      client,
      message.guild!.id,
      normalizedEvent,
      true,
      channel.id,
    );

    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(
            icons.enable +
              " Enabled `" +
              normalizedEvent +
              "` in " +
              channel.toString() +
              ".",
          ),
        ),
      ],
    });
  },

  subcommands: [
    new MessageSubcommand({
      name: "all",
      description: "Enable a bot event server-wide.",
      arguments: [
        {
          name: "event",
          type: "string",
          description: "The event to enable.",
          required: true,
        },
      ],

      async execute(client, message, args) {
        const rawEvent = args.getString("event");

        if (!rawEvent) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(
                  "Usage: `,enableevent all <event>`\nEvents: " +
                    BOT_EVENTS.map((e) => `\`${e}\``).join(", "),
                ),
              ),
            ],
          });

          return;
        }

        const normalizedEvent = rawEvent
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");

        if (!BOT_EVENTS.some((e) => e === normalizedEvent)) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(
                  icons.Wrong +
                    " Unknown event. Available: " +
                    BOT_EVENTS.map((e) => `\`${e}\``).join(", "),
                ),
              ),
            ],
          });

          return;
        }

        await setBotEventEnabled(
          client,
          message.guild!.id,
          normalizedEvent,
          true,
        );

        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(
                icons.enable +
                  " Enabled `" +
                  normalizedEvent +
                  "` server-wide.",
              ),
            ),
          ],
        });
      },
    }),
  ],
});
