import {
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import { SlashCommand } from "../../../classes/Command";
import { PingCommand } from "../../shared/ping";

import { Container, Text } from "../../../ui/components";

export default new SlashCommand({
  data: new SlashCommandBuilder()
    .setName(PingCommand.name)
    .setDescription(PingCommand.description)
    .setContexts(
      InteractionContextType.BotDM,
      InteractionContextType.Guild,
      InteractionContextType.PrivateChannel,
    )
    .setIntegrationTypes(
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall,
    ),

  category: PingCommand.category,

  async execute(client, interaction) {
    const sent = await interaction.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [new Container().text(Text("Pinging..."))],
      withResponse: true,
    });

    if (!sent.resource?.message) return;

    const latency =
      sent.resource.message.createdTimestamp - interaction.createdTimestamp;

    const page = new Container().text(
      Text(`**API Latency:** \`${client.ws.ping}ms\``),
      Text(`**edit:** \`${latency}ms\``),
    );

    await interaction.editReply({
      flags: MessageFlags.IsComponentsV2,
      components: [page],
    });
  },
});
