import {
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import { icons } from "@/utils/icons";

import { SlashCommand } from "@/classes/Command";
import {
  getTimezone,
  getTimezoneDifference,
  setTimezone,
  unsetTimezone,
} from "@/commands/shared/timezone";
import { Container, Text } from "@/ui/components";
import errorUI from "@/ui/error";

export default new SlashCommand({
  data: new SlashCommandBuilder()
    .setName("timezone")
    .setDescription("View or set local timezones.")

    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Set your local timezone.")
        .addStringOption((opt) =>
          opt
            .setName("timezone")
            .setDescription(
              "Timezone identifier (America/New_York, UTC, EST, etc).",
            )
            .setRequired(true),
        ),
    )

    .addSubcommand((sub) =>
      sub
        .setName("get")
        .setDescription("View local time for a user.")
        .addUserOption((opt) =>
          opt
            .setName("user")
            .setDescription("The user whose timezone to view.")
            .setRequired(false),
        ),
    )

    .addSubcommand((sub) =>
      sub.setName("unset").setDescription("Remove your saved timezone."),
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

    if (subcommand === "set") {
      const input = interaction.options.getString("timezone", true);

      await interaction.deferReply();

      try {
        const result = await setTimezone(client, interaction.user.id, input);

        await interaction.editReply({
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
        await interaction.editReply({
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

      return;
    }

    if (subcommand === "unset") {
      await interaction.deferReply();

      try {
        const removed = await unsetTimezone(client, interaction.user.id);

        if (!removed) {
          await interaction.editReply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              errorUI(
                icons.clock + " " + client.i18n.t("commands.timezone.not_set"),
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
                icons.clock + " " + client.i18n.t("commands.timezone.removed"),
              ),
            ),
          ],
        });
      } catch (error) {
        client.logger.error("Failed to unset timezone", {
          error,
          user: interaction.user.id,
        });

        await interaction.editReply({
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

      return;
    }

    if (subcommand === "get") {
      const targetUser =
        interaction.options.getUser("user") ?? interaction.user;

      await interaction.deferReply();

      try {
        const tzData = await getTimezone(client, targetUser.id);

        if (!tzData) {
          const self = targetUser.id === interaction.user.id;

          await interaction.editReply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              errorUI(
                self
                  ? client.i18n.t("commands.timezone.not_set_yet", {
                      command: "/timezone set <timezone>",
                    })
                  : client.i18n.t("commands.timezone.user_not_set", {
                      user: targetUser.username,
                    }),
              ),
            ],
          });

          return;
        }

        const self = targetUser.id === interaction.user.id;

        let metadata = `${tzData.timezone} (${tzData.offsetString})`;

        if (!self) {
          const callerTimezone = await getTimezone(client, interaction.user.id);

          if (callerTimezone) {
            metadata += ` · ${getTimezoneDifference(
              tzData.timezone,
              callerTimezone.timezone,
            )}`;
          }
        }

        await interaction.editReply({
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
      } catch (error) {
        client.logger.error("Failed to get timezone", {
          error,
          user: interaction.user.id,
        });

        await interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            errorUI(
              icons.clock +
                " " +
                client.i18n.t("commands.timezone.fetch_error"),
            ),
          ],
        });
      }
    }
  },
});
