import {
  MessageFlags,
  TimestampStyles,
  time,
  type InteractionReplyOptions,
  type GuildMember,
} from "discord.js";

import Event from "@/classes/Event";
import { Container, Text } from "@/ui/components";
import { checkCooldown, setCooldown } from "@/utils/cooldown";
import { checkPermissions } from "@/utils/permission";

export default new Event({
  name: "interactionCreate",

  async execute(client, interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command = client.slashCommands.get(interaction.commandName);

    if (!command) return;

    if (!interaction.guild || !interaction.channel) return;
    if (interaction.channel.isDMBased()) return;

    const member = interaction.member as GuildMember | null;
    const botMember = interaction.guild.members.me;

    if (!member || !botMember) return;

    if (
      !checkPermissions(member, interaction.channel, command.userPermissions)
    ) {
      await interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [
          new Container().text(
            Text("You don't have permission to use this command."),
          ),
        ],
      });

      return;
    }

    if (
      !checkPermissions(botMember, interaction.channel, command.botPermissions)
    ) {
      await interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [
          new Container().text(
            Text("I don't have permission to run this command."),
          ),
        ],
      });

      return;
    }

    const cooldown = command.cooldown ?? client.config.defaults.cooldown;

    const remaining = checkCooldown(
      client,
      "slash",
      interaction.user.id,
      command,
      {
        interaction,
      },
    );

    if (remaining) {
      const retryAt = Math.floor(Date.now() / 1000) + remaining;

      await interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [
          new Container().text(
            Text(
              `You may use this command ${time(
                retryAt,
                TimestampStyles.RelativeTime,
              )}`,
            ),
          ),
        ],
      });

      return;
    }

    setCooldown(client, "slash", interaction.user.id, command, cooldown, {
      interaction,
    });

    const start = performance.now();

    try {
      const group = interaction.options.getSubcommandGroup(false);
      const subcommand = interaction.options.getSubcommand(false);

      const path = [interaction.commandName, group, subcommand].filter(Boolean);

      const commandPath = path.join(":");

      client.logger.info("Executing slash command", {
        command: commandPath,
        user: interaction.user.id,
        guild: interaction.guild.id,
        channel: interaction.channel.id,
      });

      await command.execute(client, interaction);

      client.logger.info("Slash command completed", {
        command: commandPath,
        user: interaction.user.id,
        guild: interaction.guild.id,
        channel: interaction.channel.id,
        duration: `${(performance.now() - start).toFixed(2)}ms`,
      });
    } catch (error) {
      const group = interaction.options.getSubcommandGroup(false);
      const subcommand = interaction.options.getSubcommand(false);

      const commandPath = [interaction.commandName, group, subcommand]
        .filter(Boolean)
        .join(":");

      client.logger.error("Error executing slash command", {
        error,
        command: commandPath,
        user: interaction.user.id,
        guild: interaction.guild.id,
        channel: interaction.channel.id,
        duration: `${(performance.now() - start).toFixed(2)}ms`,
      });

      const reply: InteractionReplyOptions = {
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [
          new Container().addTextDisplayComponents(
            Text("Something went wrong while executing this command."),
          ),
        ],
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    }
  },
});
