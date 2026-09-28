import Command from "@/classes/Command";

export default new Command({
  name: "ping",
  description: "Replies with pong",
  everywhere: true,
  execute: async (client, interaction) => {
    await interaction.reply({ content: "pong" });
  },
});
