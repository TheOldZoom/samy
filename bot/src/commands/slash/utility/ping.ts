import { SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../../../classes/Command";
import { PingCommand } from "../../shared/ping";

export default new SlashCommand({
  data: new SlashCommandBuilder()
    .setName(PingCommand.name)
    .setDescription(PingCommand.description),

  category: PingCommand.category,

  async execute(client, interaction) {
    const sent = await interaction.reply({
      content: "Pinging...",
      withResponse: true,
    });

    if (!sent.resource?.message) return;

    const latency =
      sent.resource.message.createdTimestamp - interaction.createdTimestamp;

    await interaction.editReply(
      `Pong!\nAPI: **${client.ws.ping}ms**\nLatency: **${latency}ms**`,
    );
  },
});
