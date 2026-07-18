import { MessageFlags } from "discord.js";

import { MessageCommand } from "../../../classes/Command";
import { PingCommand } from "../../shared/ping";

import { Container, Text } from "../../../ui/components";

export default new MessageCommand({
  name: PingCommand.name,
  description: PingCommand.description,
  category: PingCommand.category,

  async execute(client, message) {
    const sent = await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [new Container().text(Text("Pinging.."))],
    });

    const latency = sent.createdTimestamp - message.createdTimestamp;

    const page = new Container().text(
      Text(`**API Latency:** \`${client.ws.ping}ms\``),
      Text(`**Message Latency:** \`${latency}ms\``),
    );

    await sent.edit({
      flags: MessageFlags.IsComponentsV2,
      components: [page],
    });
  },
});
