import {
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import { icons } from "@/utils/icons";

import { SlashCommand } from "@/classes/Command";
import {
  getGuildLocale,
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

export default new SlashCommand({
  data: new SlashCommandBuilder()
    .setName("locale")
    .setDescription("View or set your preferred language, or the server's.")

    .addSubcommand((sub) =>
      sub
        .setName("view")
        .setDescription("View your locale, or the server's.")
        .addStringOption((opt) =>
          opt
            .setName("scope")
            .setDescription("Whose locale to view.")
            .setRequired(false)
            .addChoices(
              { name: "User", value: "user" },
              { name: "Server", value: "server" },
            ),
        ),
    )

    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription(
          "Set your preferred language, or the server's language.",
        )
        .addStringOption((opt) =>
          opt
            .setName("scope")
            .setDescription("Whether to set your own locale or the server's.")
            .setRequired(true)
            .addChoices(
              { name: "User", value: "user" },
              { name: "Server", value: "server" },
            ),
        )
        .addStringOption((opt) =>
          opt
            .setName("locale")
            .setDescription("Locale identifier (en-US, es-ES, fr-FR, etc).")
            .setRequired(true),
        ),
    )

    .addSubcommand((sub) =>
      sub
        .setName("unset")
        .setDescription(
          "Reset your language, or the server's, back to automatic detection.",
        )
        .addStringOption((opt) =>
          opt
            .setName("scope")
            .setDescription("Whether to reset your own locale or the server's.")
            .setRequired(false)
            .addChoices(
              { name: "User", value: "user" },
              { name: "Server", value: "server" },
            ),
        ),
    )

    .setContexts(
      InteractionContextType.BotDM,
      InteractionContextType.Guild,
      InteractionContextType.PrivateChannel,
    )

    .setIntegrationTypes(
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall,
    ),

  category: "Utility",

  async execute(client, interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "view") {
      const scope =
        parseScope(interaction.options.getString("scope")) ?? "user";

      await interaction.deferReply();

      if (scope === "server") {
        if (!interaction.guild) {
          await interaction.editReply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              errorUI(
                icons.globe + " " + client.i18n.t("commands.locale.guild_only"),
              ),
            ],
          });

          return;
        }

        try {
          const saved = await getGuildLocale(client, interaction.guild.id);

          await interaction.editReply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(
                  saved
                    ? client.i18n.t("commands.locale.current_server", {
                        locale: saved,
                      })
                    : client.i18n.t("commands.locale.auto_server", {
                        locale: client.i18n.currentLocale(),
                      }),
                ),
              ),
            ],
          });
        } catch (error) {
          client.logger.error("Failed to fetch guild locale", {
            error,
            guild: interaction.guild.id,
          });

          await interaction.editReply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              errorUI(
                icons.globe +
                  " " +
                  client.i18n.t("commands.locale.fetch_error"),
              ),
            ],
          });
        }

        return;
      }

      try {
        const saved = await getLocale(client, interaction.user.id);

        await interaction.editReply({
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
        client.logger.error("Failed to fetch locale", {
          error,
          user: interaction.user.id,
        });

        await interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            errorUI(
              icons.globe + " " + client.i18n.t("commands.locale.fetch_error"),
            ),
          ],
        });
      }

      return;
    }

    if (subcommand === "set") {
      const scope = parseScope(interaction.options.getString("scope", true));
      const input = interaction.options.getString("locale", true);

      if (!scope) {
        await interaction.reply({
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

      if (scope === "server") {
        if (!interaction.guild) {
          await interaction.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              errorUI(
                icons.globe + " " + client.i18n.t("commands.locale.guild_only"),
              ),
            ],
          });

          return;
        }

        if (
          !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)
        ) {
          await interaction.reply({
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

        await interaction.deferReply();

        try {
          const locale = await setGuildLocale(
            client,
            interaction.guild.id,
            input,
          );

          await client.i18n.withResolvedLocale(
            { userId: interaction.user.id, guildId: interaction.guildId },
            async () => {
              await interaction.editReply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                  new Container().text(
                    Text(
                      icons.globe +
                        " " +
                        client.i18n.t("commands.locale.set_server", { locale }),
                    ),
                  ),
                ],
              });
            },
          );
        } catch (error) {
          await interaction.editReply({
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

      await interaction.deferReply();

      try {
        const locale = await setLocale(client, interaction.user.id, input);

        await client.i18n.withResolvedLocale(
          { userId: interaction.user.id, guildId: interaction.guildId },
          async () => {
            await interaction.editReply({
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
        await interaction.editReply({
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

    if (subcommand === "unset") {
      const scope =
        parseScope(interaction.options.getString("scope")) ?? "user";

      if (scope === "server") {
        if (!interaction.guild) {
          await interaction.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              errorUI(
                icons.globe + " " + client.i18n.t("commands.locale.guild_only"),
              ),
            ],
          });

          return;
        }

        if (
          !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)
        ) {
          await interaction.reply({
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

        await interaction.deferReply();

        try {
          const removed = await unsetGuildLocale(client, interaction.guild.id);

          if (!removed) {
            await interaction.editReply({
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

          await interaction.editReply({
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
            guild: interaction.guild.id,
          });

          await interaction.editReply({
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

      await interaction.deferReply();

      try {
        const removed = await unsetLocale(client, interaction.user.id);

        if (!removed) {
          await interaction.editReply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              errorUI(
                icons.globe + " " + client.i18n.t("commands.locale.not_set"),
              ),
            ],
          });

          return;
        }

        await interaction.editReply({
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
          user: interaction.user.id,
        });

        await interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            errorUI(
              icons.globe + " " + client.i18n.t("commands.locale.remove_error"),
            ),
          ],
        });
      }
    }
  },
});
