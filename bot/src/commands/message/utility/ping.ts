import { MessageCommand } from "../../../classes/Command";
import { PingCommand } from "../../shared/ping";

export default new MessageCommand({
  name: PingCommand.name,
  description: PingCommand.description,
  category: PingCommand.category,

  async execute(client, message) {
    const sent = await message.reply("Pinging...");

    const latency = sent.createdTimestamp - message.createdTimestamp;

    await sent.edit(
      `Pong!\nAPI: **${client.ws.ping}ms**\nLatency: **${latency}ms**`,
    );
  },
});
