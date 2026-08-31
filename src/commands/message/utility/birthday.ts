import { MessageFlags, time, TimestampStyles } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand, MessageSubcommand } from "@/classes/Command";
import {
  getBirthday,
  getUpcomingBirthdays,
  setBirthday,
  unsetBirthday,
} from "@/commands/shared/birthday";
import { Container, Text } from "@/ui/components";
import errorUI from "@/ui/error";

export default new MessageCommand({
  name: "birthday",
  description: "View, set, or list birthdays.",
  category: "Utility",
  aliases: ["bday", "bd"],

  arguments: [
    {
      name: "target",
      aliases: ["u", "user"],
      type: "user",
      description: "The user whose birthday you want to view.",
      required: false,
    },
  ],

  async execute(client, message, args) {
    try {
      const targetUser = args.getUser("target") ?? message.author;
      const bday = await getBirthday(client, targetUser.id);

      if (!bday) {
        const self = targetUser.id === message.author.id;

        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            errorUI(
              self
                ? client.i18n.t("commands.birthday.not_set_yet", {
                    command: "bday set <date>",
                  })
                : client.i18n.t("commands.birthday.user_not_set", {
                    user: targetUser.username,
                  }),
            ),
          ],
        });

        return;
      }

      const self = targetUser.id === message.author.id;

      const next =
        bday.daysUntil === 0
          ? client.i18n.t("commands.birthday.today")
          : time(bday.nextBirthdayTimestamp, TimestampStyles.RelativeTime);

      const age =
        bday.age !== undefined
          ? client.i18n.t("commands.birthday.turning", {
              age: bday.age,
            })
          : "";

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(icons.bday + " " + client.i18n.t("commands.birthday.details", {
                owner: self ? "Your" : `**${targetUser.username}'s**`,
                date: bday.formattedDate,
                next,
                age,
              }),
            ),
          ),
        ],
      });
    } catch (error) {
      client.logger.error("Failed to execute birthday command", {
        error,
        user: message.author.id,
      });

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [errorUI(icons.bday + " " + client.i18n.t("commands.birthday.fetch_error"))],
      });
    }
  },

  subcommands: [
    new MessageSubcommand({
      name: "set",
      description: "Set your birthday.",

      arguments: [
        {
          name: "date",
          aliases: ["d"],
          type: "string",
          description: "Your date of birth (MM/DD/YYYY, MM/DD, or May 15).",
          required: true,
        },
      ],

      async execute(client, message, args) {
        const input = args.getString("date");

        if (!input) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              errorUI(icons.bday + " " + client.i18n.t("commands.birthday.provide_date")),
            ],
          });

          return;
        }

        try {
          const result = await setBirthday(client, message.author.id, input);

          const next =
            result.daysUntil === 0
              ? client.i18n.t("commands.birthday.today")
              : time(
                  result.nextBirthdayTimestamp,
                  TimestampStyles.RelativeTime,
                );

          const age =
            result.age !== undefined
              ? client.i18n.t("commands.birthday.turning", {
                  age: result.age,
                })
              : "";

          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(icons.bday + " " + client.i18n.t("commands.birthday.saved", {
                    date: result.formattedDate,
                    next,
                    age,
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
                  : client.i18n.t("commands.birthday.invalid_date"),
              ),
            ],
          });
        }
      },
    }),

    new MessageSubcommand({
      name: "unset",
      aliases: ["remove", "clear"],
      description: "Remove your saved birthday.",

      async execute(client, message) {
        try {
          const removed = await unsetBirthday(client, message.author.id);

          if (!removed) {
            await message.reply({
              flags: MessageFlags.IsComponentsV2,
              components: [errorUI(icons.bday + " " + client.i18n.t("commands.birthday.not_set"))],
            });

            return;
          }

          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(icons.bday + " " + client.i18n.t("commands.birthday.removed")),
              ),
            ],
          });
        } catch (error) {
          client.logger.error("Failed to unset birthday", {
            error,
            user: message.author.id,
          });

          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              errorUI(icons.bday + " " + client.i18n.t("commands.birthday.remove_error")),
            ],
          });
        }
      },
    }),
    new MessageSubcommand({
      name: "list",
      aliases: ["upcoming"],
      description: "List upcoming birthdays in the server.",

      async execute(client, message) {
        if (!message.guild) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              errorUI(icons.bday + " " + client.i18n.t("commands.birthday.guild_only")),
            ],
          });

          return;
        }

        try {
          const members = await message.guild.members.fetch();
          const memberIds = Array.from(members.keys());

          const upcoming = await getUpcomingBirthdays(client, memberIds);

          if (upcoming.length === 0) {
            await message.reply({
              flags: MessageFlags.IsComponentsV2,
              components: [
                new Container().text(
                  Text(icons.bday + " " + client.i18n.t("commands.birthday.none_upcoming")),
                ),
              ],
            });

            return;
          }

          const lines = upcoming.slice(0, 10).map((bday) => {
            const member = members.get(bday.userId);

            const name = member
              ? `**${member.user.username}**`
              : `<@${bday.userId}>`;

            const when =
              bday.daysUntil === 0
                ? client.i18n.t("commands.birthday.today")
                : time(
                    bday.nextBirthdayTimestamp,
                    TimestampStyles.RelativeTime,
                  );

            return `${name} - ${bday.mmddyyyy} (${when})`;
          });

          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(icons.bday + " " + client.i18n.t("commands.birthday.upcoming", {
                    birthdays: lines.join("\n"),
                  }),
                ),
              ),
            ],
          });
        } catch (error) {
          client.logger.error("Failed to list upcoming birthdays", {
            error,
            guild: message.guild.id,
          });

          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              errorUI(icons.bday + " " + client.i18n.t("commands.birthday.upcoming_error")),
            ],
          });
        }
      },
    }),

    new MessageSubcommand({
      name: "get",
      description: "View birthday of a user.",

      arguments: [
        {
          name: "target",
          aliases: ["u", "user"],
          type: "user",
          description: "The user to view birthday for.",
          required: false,
        },
      ],

      async execute(client, message, args) {
        const targetUser = args.getUser("target") ?? message.author;

        const bday = await getBirthday(client, targetUser.id);

        if (!bday) {
          const self = targetUser.id === message.author.id;

          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              errorUI(
                self
                  ? client.i18n.t("commands.birthday.not_set_yet", {
                      command: "bday set <date>",
                    })
                  : client.i18n.t("commands.birthday.user_not_set", {
                      user: targetUser.username,
                    }),
              ),
            ],
          });

          return;
        }

        const self = targetUser.id === message.author.id;

        const next =
          bday.daysUntil === 0
            ? client.i18n.t("commands.birthday.today")
            : time(bday.nextBirthdayTimestamp, TimestampStyles.RelativeTime);

        const age =
          bday.age !== undefined
            ? client.i18n.t("commands.birthday.turning", {
                age: bday.age,
              })
            : "";

        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(icons.bday + " " + client.i18n.t("commands.birthday.details", {
                  owner: self ? "Your" : `**${targetUser.username}'s**`,
                  date: bday.formattedDate,
                  next,
                  age,
                }),
              ),
            ),
          ],
        });
      },
    }),
  ],
});
