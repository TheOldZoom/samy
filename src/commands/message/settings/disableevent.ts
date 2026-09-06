import { MessageFlags, ChannelType } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand, MessageSubcommand } from "@/classes/Command";
import { Container, Text } from "@/ui/components";

import {
  BOT_EVENTS,
  setBotEventEnabled,
  getBotEventSettings,
} from "@/utils/botEvents";

export default new MessageCommand({
  name: "disableevent",
  description: "Disable a bot event in this server or channel.",
  category: "Settings",
  guildOnly: true,
  userPermissions: ["ManageChannels"],

  arguments: [
    {
      name: "channel",
      type: "channel",
      description: "The channel to disable the event in.",
      required: true,
    },
    {
      name: "event",
      type: "string",
      description: "The event to disable.",
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
              "Usage: `,disableevent <channel> <event>`\nEvents: " +
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
              "Usage: `,disableevent <channel> <event>`\nEvents: " +
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
      false,
      channel.id,
    );

    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(
            icons.disable +
              " Disabled `" +
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
      description: "Disable a bot event server-wide.",
      arguments: [
        {
          name: "event",
          type: "string",
          description: "The event to disable.",
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
                  "Usage: `,disableevent all <event>`\nEvents: " +
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
          false,
        );

        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(
                icons.disable +
                  " Disabled `" +
                  normalizedEvent +
                  "` server-wide.",
              ),
            ),
          ],
        });
      },
    }),

    new MessageSubcommand({
      name: "list",
      description: "List all disabled bot events.",
      arguments: [],

      async execute(client, message) {
        const settings = await getBotEventSettings(client, message.guild!.id);

        const disabled = settings.filter((s) => !s.enabled);

        if (disabled.length === 0) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text("No disabled events. All bot events are enabled."),
              ),
            ],
          });

          return;
        }

        const lines = disabled.map((s) => {
          const scopeText = s.channelId
            ? `Channel: <#${s.channelId}>`
            : "Server-wide";
          return `• \`${s.event}\` — ${scopeText}`;
        });

        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text("Disabled events:\n" + lines.join("\n")),
            ),
          ],
        });
      },
    }),
  ],
});
