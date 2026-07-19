import { MessageFlags, type MessageReplyOptions } from "discord.js";
import Event from "../classes/Event";
import { Container, Text } from "../ui/components";

export default new Event({
  name: "messageCreate",

  async execute(client, message) {
    if (message.author.bot) return;
    if (!message.guild) return;

    const prefix = client.prefix;

    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/\s+/);

    const commandName = args.shift()?.toLowerCase();

    if (!commandName) return;

    const command = client.messageCommands.get(commandName);

    if (!command) return;

    try {
      await command.execute(client, message, args);
    } catch (error) {
      client.logger.error("Error executing message command", {
        error,
        command: commandName,
      });

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().addTextDisplayComponents(
            Text("Something went wrong while executing this command."),
          ),
        ],
      });
    }
  },
});
