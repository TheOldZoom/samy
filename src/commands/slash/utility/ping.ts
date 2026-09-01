import {
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import { icons } from "@/utils/icons";

import { SlashCommand } from "@/classes/Command";
import { PingCommand } from "@/commands/shared/ping";

import { Container, Text } from "@/ui/components";

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
      components: [
        new Container().text(
          Text(
            icons.ping +
              " " +
              client.i18n.t("commands.ping.latency", {
                latency: client.ws.ping,
              }),
          ),
        ),
      ],
      withResponse: true,
    });

    if (!sent.resource?.message) return;

    const latency =
      sent.resource.message.createdTimestamp - interaction.createdTimestamp;

    const page = new Container()
      .text(
        Text(
          icons.ping +
            " " +
            client.i18n.t("commands.ping.latency", {
              latency: client.ws.ping,
            }),
        ),
      )
      .text(
        Text(
          icons.ping +
            " " +
            client.i18n.t("commands.ping.edit", {
              latency,
            }),
        ),
      );

    await interaction.editReply({
      flags: MessageFlags.IsComponentsV2,
      components: [page],
    });
  },
});
