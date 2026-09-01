import { MessageFlags, PermissionFlagsBits } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand, MessageSubcommand } from "@/classes/Command";
import {
  getLocale,
  setGuildLocale,
  setLocale,
  unsetGuildLocale,
  unsetLocale,
} from "@/commands/shared/locale";
import { Container, Text } from "@/ui/components";
import errorUI from "@/ui/error";

type Scope = "user" | "server";

function parseScope(input: string | null | undefined): Scope | null {
  const normalized = input?.trim().toLowerCase();

  if (normalized === "server" || normalized === "guild") return "server";
  if (normalized === "user" || normalized === "me") return "user";

  return null;
}

export default new MessageCommand({
  name: "locale",
  description: "View or set language preferences.",
  category: "Utility",
  aliases: ["lang", "language"],

  async execute(client, message) {
    try {
      const saved = await getLocale(client, message.author.id);

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              saved
                ? client.i18n.t("commands.locale.current", { locale: saved })
                : client.i18n.t("commands.locale.auto", {
                    locale: client.i18n.currentLocale(),
                  }),
            ),
          ),
        ],
      });
    } catch (error) {
      client.logger.error("Failed to execute locale command", {
        error,
        user: message.author.id,
      });

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          errorUI(
            icons.globe + " " + client.i18n.t("commands.locale.fetch_error"),
          ),
        ],
      });
    }
  },

  subcommands: [
    new MessageSubcommand({
      name: "set",
      description: "Set your preferred language, or the server's language.",

      arguments: [
        {
          name: "scope",
          aliases: ["s"],
          type: "string",
          description:
            "Whether to set your own locale or the server's (user or server).",
          required: true,
        },
        {
          name: "locale",
          aliases: ["l"],
          type: "string",
          description: "Locale identifier (en-US, es-ES, fr-FR, etc).",
          required: true,
        },
      ],

      async execute(client, message, args) {
        const scope = parseScope(args.getString("scope"));
        const input = args.getString("locale");

        if (!scope) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              errorUI(
                icons.globe +
                  " " +
                  client.i18n.t("commands.locale.invalid_scope"),
              ),
            ],
          });

          return;
        }

        if (!input) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              errorUI(
                icons.globe + " " + client.i18n.t("commands.locale.provide"),
              ),
            ],
          });

          return;
        }

        if (scope === "server") {
          if (!message.guild) {
            await message.reply({
              flags: MessageFlags.IsComponentsV2,
              components: [
                errorUI(
                  icons.globe +
                    " " +
                    client.i18n.t("commands.locale.guild_only"),
                ),
              ],
            });

            return;
          }

          if (
            !message.member?.permissions.has(PermissionFlagsBits.ManageGuild)
          ) {
            await message.reply({
              flags: MessageFlags.IsComponentsV2,
              components: [
                errorUI(
                  icons.globe +
                    " " +
                    client.i18n.t("commands.locale.missing_permission"),
                ),
              ],
            });

            return;
          }

          try {
            const locale = await setGuildLocale(
              client,
              message.guild.id,
              input,
            );

            await client.i18n.withResolvedLocale(
              { userId: message.author.id, guildId: message.guildId },
              async () => {
                await message.reply({
                  flags: MessageFlags.IsComponentsV2,
                  components: [
                    new Container().text(
                      Text(
                        icons.globe +
                          " " +
                          client.i18n.t("commands.locale.set_server", {
                            locale,
                          }),
                      ),
                    ),
                  ],
                });
              },
            );
          } catch (error) {
            await message.reply({
              flags: MessageFlags.IsComponentsV2,
              components: [
                errorUI(
                  error instanceof Error
                    ? error.message
                    : client.i18n.t("commands.locale.invalid"),
                ),
              ],
            });
          }

          return;
        }

        try {
          const locale = await setLocale(client, message.author.id, input);

          await client.i18n.withResolvedLocale(
            { userId: message.author.id, guildId: message.guildId },
            async () => {
              await message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                  new Container().text(
                    Text(
                      icons.globe +
                        " " +
                        client.i18n.t("commands.locale.set_user", { locale }),
                    ),
                  ),
                ],
              });
            },
          );
        } catch (error) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              errorUI(
                error instanceof Error
                  ? error.message
                  : client.i18n.t("commands.locale.invalid"),
              ),
            ],
          });
        }
      },
    }),

    new MessageSubcommand({
      name: "unset",
      aliases: ["remove", "clear", "reset"],
      description:
        "Reset your language, or the server's, back to automatic detection.",

      arguments: [
        {
          name: "scope",
          aliases: ["s"],
          type: "string",
          description:
            "Whether to reset your own locale or the server's (user or server). Defaults to user.",
          required: false,
        },
      ],

      async execute(client, message, args) {
        const scope = parseScope(args.getString("scope")) ?? "user";

        if (scope === "server") {
          if (!message.guild) {
            await message.reply({
              flags: MessageFlags.IsComponentsV2,
              components: [
                errorUI(
                  icons.globe +
                    " " +
                    client.i18n.t("commands.locale.guild_only"),
                ),
              ],
            });

            return;
          }

          if (
            !message.member?.permissions.has(PermissionFlagsBits.ManageGuild)
          ) {
            await message.reply({
              flags: MessageFlags.IsComponentsV2,
              components: [
                errorUI(
                  icons.globe +
                    " " +
                    client.i18n.t("commands.locale.missing_permission"),
                ),
              ],
            });

            return;
          }

          try {
            const removed = await unsetGuildLocale(client, message.guild.id);

            if (!removed) {
              await message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                  errorUI(
                    icons.globe +
                      " " +
                      client.i18n.t("commands.locale.not_set_server"),
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
                    icons.globe +
                      " " +
                      client.i18n.t("commands.locale.removed_server"),
                  ),
                ),
              ],
            });
          } catch (error) {
            client.logger.error("Failed to unset guild locale", {
              error,
              guild: message.guild.id,
            });

            await message.reply({
              flags: MessageFlags.IsComponentsV2,
              components: [
                errorUI(
                  icons.globe +
                    " " +
                    client.i18n.t("commands.locale.remove_error"),
                ),
              ],
            });
          }

          return;
        }

        try {
          const removed = await unsetLocale(client, message.author.id);

          if (!removed) {
            await message.reply({
              flags: MessageFlags.IsComponentsV2,
              components: [
                errorUI(
                  icons.globe + " " + client.i18n.t("commands.locale.not_set"),
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
                  icons.globe + " " + client.i18n.t("commands.locale.removed"),
                ),
              ),
            ],
          });
        } catch (error) {
          client.logger.error("Failed to unset locale", {
            error,
            user: message.author.id,
          });

          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              errorUI(
                icons.globe +
                  " " +
                  client.i18n.t("commands.locale.remove_error"),
              ),
            ],
          });
        }
      },
    }),
  ],
});
