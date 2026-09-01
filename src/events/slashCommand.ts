import {
  MessageFlags,
  TimestampStyles,
  time,
  type ChatInputCommandInteraction,
  type ContextMenuCommandInteraction,
  type GuildMember,
  type InteractionReplyOptions,
} from "discord.js";

import type Client from "@/classes/client";
import type { ContextCommand, SlashCommand } from "@/classes/Command";
import Event from "@/classes/Event";
import { checkCooldown, setCooldown, type CommandType } from "@/utils/cooldown";
import { checkPermissions } from "@/utils/permission";
import { isCommandEnabled, isCommandRestricted } from "@/utils/settings";
import errorUI from "@/ui/error";

async function runGuardedCommand(
  client: Client,
  interaction: ChatInputCommandInteraction | ContextMenuCommandInteraction,
  command: SlashCommand | ContextCommand,
  commandPath: string,
  scope: CommandType,
  run: () => Promise<void>,
): Promise<void> {
  if (command.options.guildOnly && !interaction.inGuild()) {
    await interaction.reply({
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      components: [errorUI(client.i18n.t("errors.guild_only"))],
    });

    return;
  }

  if (interaction.inGuild() && interaction.guild) {
    const member = interaction.member as GuildMember;
    const botMember = interaction.guild.members.me;

    if (!botMember) {
      client.logger.warn("Bot member unavailable", {
        command: commandPath,
        guild: interaction.guildId,
      });

      return;
    }

    const channel =
      interaction.channel ??
      (await client.channels.fetch(interaction.channelId).catch(() => null));

    if (!channel || !channel.isTextBased() || channel.isDMBased()) {
      client.logger.warn("Unable to resolve guild text channel", {
        command: commandPath,
        guild: interaction.guildId,
        channel: interaction.channelId,
      });

      return;
    }

    if (
      !(await checkPermissions(
        member,
        channel,
        command.options.userPermissions,
      ))
    ) {
      await interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [errorUI(client.i18n.t("errors.missing_permissions"))],
      });

      return;
    }

    if (
      !(await checkPermissions(
        botMember,
        channel,
        command.options.botPermissions,
      ))
    ) {
      await interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [errorUI(client.i18n.t("errors.bot_missing_permissions"))],
      });

      return;
    }
  }

  const cooldown = command.cooldown ?? client.config.defaults.cooldown;

  const remaining = checkCooldown(client, scope, interaction.user.id, command, {
    interaction,
  });

  if (remaining) {
    const retryAt = Math.floor(Date.now() / 1000) + remaining;

    await interaction.reply({
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      components: [
        errorUI(
          client.i18n.t("errors.cooldown", {
            time: time(retryAt, TimestampStyles.RelativeTime),
          }),
        ),
      ],
    });

    return;
  }

  setCooldown(client, scope, interaction.user.id, command, cooldown, {
    interaction,
  });

  const start = performance.now();

  try {
    client.logger.info(`Executing ${scope} command`, {
      command: commandPath,
      user: interaction.user.id,
      guild: interaction.guildId,
      channel: interaction.channelId,
    });

    await run();

    client.logger.info(`${scope} command completed`, {
      command: commandPath,
      user: interaction.user.id,
      guild: interaction.guildId,
      channel: interaction.channelId,
      duration: `${(performance.now() - start).toFixed(2)}ms`,
    });
  } catch (error) {
    client.logger.error(`Error executing ${scope} command`, {
      error,
      command: commandPath,
      user: interaction.user.id,
      guild: interaction.guildId,
      channel: interaction.channelId,
      duration: `${(performance.now() - start).toFixed(2)}ms`,
    });

    const reply: InteractionReplyOptions = {
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      components: [errorUI(client.i18n.t("errors.command_failed"))],
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
}

export default new Event({
  name: "interactionCreate",

  async execute(client, interaction) {
    if (interaction.isChatInputCommand()) {
      await client.i18n.withResolvedLocale(
        {
          userId: interaction.user.id,
          guildId: interaction.guildId,
          interactionLocale: interaction.locale,
        },
        async () => {
          client.logger.info("Received slash command", {
            command: interaction.commandName,
            user: interaction.user.id,
            guild: interaction.guildId,
            channel: interaction.channelId,
          });

          const command = client.slashCommands.get(interaction.commandName);

          if (!command) {
            client.logger.info("Unknown slash command", {
              command: interaction.commandName,
              user: interaction.user.id,
              guild: interaction.guildId,
              channel: interaction.channelId,
            });

            return;
          }

          const group = interaction.options.getSubcommandGroup(false);
          const subcommand = interaction.options.getSubcommand(false);

          const commandPath = [interaction.commandName, group, subcommand]
            .filter(Boolean)
            .join(":");

          if (interaction.guild) {
            const guildId = interaction.guildId;
            const isOwner = client.config.devs.includes(interaction.user.id);

            if (!isOwner && guildId) {
              const commandEnabled = await isCommandEnabled(
                guildId,
                interaction.commandName,
                interaction.channelId,
                interaction.user.id,
                client,
              );

              if (!commandEnabled) {
                await interaction.reply({
                  flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                  components: [
                    errorUI(
                      client.i18n.t("errors.command_disabled", {
                        command: interaction.commandName,
                      }),
                    ),
                  ],
                });

                return;
              }

              if (command.options.ownerOnly) {
                await interaction.reply({
                  flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                  components: [errorUI(client.i18n.t("errors.owner_only"))],
                });

                return;
              }

              const restrictions = await isCommandRestricted(
                guildId,
                interaction.commandName,
                client,
              );

              if (restrictions.length > 0 && interaction.member) {
                const member = interaction.member as GuildMember;
                const hasAllowedRole = restrictions.some((r) =>
                  member.roles.cache.has(r.roleId),
                );

                if (!hasAllowedRole) {
                  await interaction.reply({
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                    components: [
                      errorUI(client.i18n.t("errors.command_restricted")),
                    ],
                  });

                  return;
                }
              }
            }
          }

          await runGuardedCommand(
            client,
            interaction,
            command,
            commandPath,
            "slash",
            () => command.execute(client, interaction),
          );
        },
      );

      return;
    }

    if (interaction.isContextMenuCommand()) {
      await client.i18n.withResolvedLocale(
        {
          userId: interaction.user.id,
          guildId: interaction.guildId,
          interactionLocale: interaction.locale,
        },
        async () => {
          client.logger.info("Received context menu command", {
            command: interaction.commandName,
            user: interaction.user.id,
            guild: interaction.guildId,
            channel: interaction.channelId,
          });

          const command = client.contextCommands.get(interaction.commandName);

          if (!command) {
            client.logger.info("Unknown context menu command", {
              command: interaction.commandName,
              user: interaction.user.id,
              guild: interaction.guildId,
              channel: interaction.channelId,
            });

            return;
          }

          if (interaction.guild) {
            const guildId = interaction.guildId;
            const isOwner = client.config.devs.includes(interaction.user.id);

            if (!isOwner && guildId) {
              const commandEnabled = await isCommandEnabled(
                guildId,
                interaction.commandName,
                interaction.channelId,
                interaction.user.id,
                client,
              );

              if (!commandEnabled) {
                await interaction.reply({
                  flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                  components: [
                    errorUI(
                      client.i18n.t("errors.command_disabled", {
                        command: interaction.commandName,
                      }),
                    ),
                  ],
                });

                return;
              }

              if (command.options.ownerOnly) {
                await interaction.reply({
                  flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                  components: [errorUI(client.i18n.t("errors.owner_only"))],
                });

                return;
              }

              const restrictions = await isCommandRestricted(
                guildId,
                interaction.commandName,
                client,
              );

              if (restrictions.length > 0 && interaction.member) {
                const member = interaction.member as GuildMember;
                const hasAllowedRole = restrictions.some((r) =>
                  member.roles.cache.has(r.roleId),
                );

                if (!hasAllowedRole) {
                  await interaction.reply({
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                    components: [
                      errorUI(client.i18n.t("errors.command_restricted")),
                    ],
                  });

                  return;
                }
              }
            }
          }

          await runGuardedCommand(
            client,
            interaction,
            command,
            interaction.commandName,
            "context",
            () => command.execute(client, interaction),
          );
        },
      );

      return;
    }
  },
});
