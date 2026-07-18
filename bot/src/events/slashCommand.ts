import Event from "../classes/Event";

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

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "There was an error executing this command.",
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: "There was an error executing this command.",
          ephemeral: true,
        });
      }
    }
  },
});
