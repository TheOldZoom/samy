import { MessageFlags, type InteractionReplyOptions } from "discord.js";
import Event from "../classes/Event";
import { Container, Text } from "../ui/components";

export default new Event({
  name: "interactionCreate",

  async execute(client, interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command = client.slashCommands.get(interaction.commandName);

    if (!command) return;

    try {
      await command.execute(client, interaction);
    } catch (error) {
      client.logger.error("Error executing slash command", {
        error,
        command: interaction.commandName,
      });

      const reply: InteractionReplyOptions = {
        flags: MessageFlags.IsComponentsV2,
        ephemeral: true,
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
