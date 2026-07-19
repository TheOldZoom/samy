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
      components: [
        new Container().text(Text(`**Latency:** \`${client.ws.ping}ms\``)),
      ],
    });

    const latency = sent.createdTimestamp - message.createdTimestamp;

    const page = new Container().text(
      Text(`**Latency:** \`${client.ws.ping}ms\``),
      Text(`**Edit:** \`${latency}ms\``),
    );

    await sent.edit({
      flags: MessageFlags.IsComponentsV2,
      components: [page],
    });
  },
});
