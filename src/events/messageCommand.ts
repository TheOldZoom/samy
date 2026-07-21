import { MessageFlags, time, TimestampStyles } from "discord.js";

import Event from "@/classes/Event";
import { MessageCommand, MessageSubcommand } from "@/classes/Command";

import { checkCooldown, setCooldown } from "@/utils/cooldown";
import { checkPermissions } from "@/utils/permission";

import { Container, Text } from "@/ui/components";

export default new Event({
  name: "messageCreate",

  async execute(client, message) {
    if (message.author.bot) return;
    if (!message.guild) return;

    if (!message.channel.isTextBased() || !("guild" in message.channel)) {
      return;
    }

    const prefix = client.prefix;

    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/\s+/);

    const commandName = args.shift()?.toLowerCase();

    if (!commandName) return;

    const command = client.messageCommands.get(commandName);

    if (!command) return;

    let current: MessageCommand | MessageSubcommand = command;
    const path: string[] = [];

    const botMember = message.guild.members.me;

    if (!botMember) return;

    if (
      !checkPermissions(botMember, message.channel, [
        "ReadMessageHistory",
        "SendMessages",
      ])
    ) {
      return;
    }
    try {
      while (args.length > 0) {
        const name = args[0];

        if (!name) break;

        const next = current.find(name.toLowerCase());

        if (!next) break;

        args.shift();
        path.push(next.name);

        current = next;
      }

      if (!current.execute) {
        return;
      }

      const member = message.member;

      if (!member) return;

      if (!checkPermissions(member, message.channel, current.userPermissions)) {
        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text("You don't have permission to use this command."),
            ),
          ],
        });

        return;
      }

      if (
        !checkPermissions(botMember, message.channel, current.botPermissions)
      ) {
        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text("I don't have permission to run this command."),
            ),
          ],
        });

        return;
      }

      const cooldown = current.cooldown ?? client.config.defaults.cooldown;

      const remaining = checkCooldown(
        client,
        "message",
        message.author.id,
        current,
        {
          path,
        },
      );

      if (remaining) {
        const retryAt = Math.floor(Date.now() / 1000) + remaining;

        await message.reply({
          flags: MessageFlags.IsComponentsV2,
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

      setCooldown(client, "message", message.author.id, current, cooldown, {
        path,
      });

      await current.execute(client, message, args);
    } catch (error) {
      client.logger.error("Error executing message command", {
        error,
        command: commandName,
        path,
      });

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text("Something went wrong while executing this command."),
          ),
        ],
      });
    }
  },
});
