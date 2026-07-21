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

    try {
      await command.execute(client, interaction);
    } catch (error) {
      client.logger.error("Error executing slash command", {
        error,
        command: interaction.commandName,
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
