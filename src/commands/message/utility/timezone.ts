import { MessageFlags } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand, MessageSubcommand } from "@/classes/Command";
import {
  getTimezone,
  getTimezoneDifference,
  setTimezone,
  unsetTimezone,
} from "@/commands/shared/timezone";
import { Container, Text } from "@/ui/components";
import errorUI from "@/ui/error";

export default new MessageCommand({
  name: "timezone",
  description: "View or set your local timezone.",
  category: "Utility",
  aliases: ["tz"],

  arguments: [
    {
      name: "target",
      aliases: ["u", "user"],
      type: "user",
      description: "The user whose timezone you want to view.",
      required: false,
    },
  ],

  async execute(client, message, args) {
    try {
      const targetUser = args.getUser("target") ?? message.author;

      const tzData = await getTimezone(client, targetUser.id);

      if (!tzData) {
        const self = targetUser.id === message.author.id;

        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            errorUI(
              self
                ? client.i18n.t("commands.timezone.not_set_yet", {
                    command: "tz set <timezone>",
                  })
                : client.i18n.t("commands.timezone.user_not_set", {
                    user: targetUser.username,
                  }),
            ),
          ],
        });

        return;
      }

      const self = targetUser.id === message.author.id;

      let extra = `${tzData.timezone} (${tzData.offsetString})`;

      if (!self) {
        const callerTimezone = await getTimezone(client, message.author.id);

        if (callerTimezone) {
          const diff = getTimezoneDifference(
            tzData.timezone,
            callerTimezone.timezone,
          );

          extra += ` · ${diff}`;
        }
      }

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.clock +
                " " +
                client.i18n.t("commands.timezone.details", {
                  owner: self ? "Your" : `**${targetUser.username}'s**`,
                  time: tzData.timeString,
                  date: tzData.dateString,
                  metadata: extra,
                }),
            ),
          ),
        ],
      });
    } catch (error) {
      client.logger.error("Failed to execute timezone command", {
        error,
        user: message.author.id,
      });

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          errorUI(
            icons.clock + " " + client.i18n.t("commands.timezone.fetch_error"),
          ),
        ],
      });
    }
  },

  subcommands: [
    new MessageSubcommand({
      name: "set",
      description: "Set your local timezone.",

      arguments: [
        {
          name: "timezone",
          aliases: ["tz"],
          type: "string",
          description: "Timezone identifier (America/New_York, UTC, EST, etc).",
          required: true,
        },
      ],

      async execute(client, message, args) {
        const input = args.getString("timezone");

        if (!input) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              errorUI(
                icons.clock + " " + client.i18n.t("commands.timezone.provide"),
              ),
            ],
          });

          return;
        }

        try {
          const result = await setTimezone(client, message.author.id, input);

          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(
                  icons.clock +
                    " " +
                    client.i18n.t("commands.timezone.set", {
                      timezone: result.timezone,
                      offset: result.offsetString,
                      time: result.timeString,
                      date: result.dateString,
                    }),
                ),
              ),
            ],
          });
        } catch (error) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              errorUI(
                error instanceof Error
                  ? error.message
                  : client.i18n.t("commands.timezone.invalid"),
              ),
            ],
          });
        }
      },
    }),

    new MessageSubcommand({
      name: "unset",
      aliases: ["remove", "clear"],
      description: "Remove your saved timezone.",

      async execute(client, message) {
        try {
          const removed = await unsetTimezone(client, message.author.id);

          if (!removed) {
            await message.reply({
              flags: MessageFlags.IsComponentsV2,
              components: [
                errorUI(
                  icons.clock +
                    " " +
                    client.i18n.t("commands.timezone.not_set"),
                ),
              ],
            });

            return;
          }

          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(
                  icons.clock +
                    " " +
                    client.i18n.t("commands.timezone.removed"),
                ),
              ),
            ],
          });
        } catch (error) {
          client.logger.error("Failed to unset timezone", {
            error,
            user: message.author.id,
          });

          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              errorUI(
                icons.clock +
                  " " +
                  client.i18n.t("commands.timezone.remove_error"),
              ),
            ],
          });
        }
      },
    }),
    new MessageSubcommand({
      name: "get",
      description: "View local time for a user.",

      arguments: [
        {
          name: "target",
          aliases: ["u", "user"],
          type: "user",
          description: "The user to view local time for.",
          required: false,
        },
      ],

      async execute(client, message, args) {
        const targetUser = args.getUser("target") ?? message.author;

        const tzData = await getTimezone(client, targetUser.id);

        if (!tzData) {
          const self = targetUser.id === message.author.id;

          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              errorUI(
                self
                  ? client.i18n.t("commands.timezone.not_set_yet", {
                      command: "tz set <timezone>",
                    })
                  : client.i18n.t("commands.timezone.user_not_set", {
                      user: targetUser.username,
                    }),
              ),
            ],
          });

          return;
        }

        const self = targetUser.id === message.author.id;

        let metadata = `${tzData.timezone} (${tzData.offsetString})`;

        if (!self) {
          const callerTimezone = await getTimezone(client, message.author.id);

          if (callerTimezone) {
            metadata += ` · ${getTimezoneDifference(
              tzData.timezone,
              callerTimezone.timezone,
            )}`;
          }
        }

        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(
                icons.clock +
                  " " +
                  client.i18n.t("commands.timezone.details", {
                    owner: self ? "Your" : `**${targetUser.username}'s**`,
                    time: tzData.timeString,
                    date: tzData.dateString,
                    metadata,
                  }),
              ),
            ),
          ],
        });
      },
    }),
  ],
});
