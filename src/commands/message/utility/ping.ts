import { MessageFlags } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand } from "@/classes/Command";
import { PingCommand } from "@/commands/shared/ping";

import { Container, Text } from "@/ui/components";

export default new MessageCommand({
  name: PingCommand.name,
  description: PingCommand.description,
  category: PingCommand.category,

  async execute(client, message) {
    const sent = await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(icons.ping + " " + client.i18n.t("commands.ping.latency", { latency: client.ws.ping }),
          ),
        ),
      ],
    });

    const latency = sent.createdTimestamp - message.createdTimestamp;

    const page = new Container().text(
      Text(icons.ping + " " + client.i18n.t("commands.ping.latency", { latency: client.ws.ping })),
      Text(icons.ping + " " + client.i18n.t("commands.ping.edit", { latency })),
    );

    await sent.edit({
      flags: MessageFlags.IsComponentsV2,
      components: [page],
    });
  },
});
