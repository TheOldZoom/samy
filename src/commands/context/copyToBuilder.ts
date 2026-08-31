import {
  ApplicationCommandType,
  ApplicationIntegrationType,
  ContextMenuCommandBuilder,
  InteractionContextType,
  MessageFlags,
} from "discord.js";

import { ContextCommand } from "@/classes/Command";
import {
  buildBuilderCopyContainer,
  decompileMessageForBuilder,
} from "@/commands/shared/builderCopy";
import errorUI from "@/ui/error";

export default new ContextCommand({
  data: new ContextMenuCommandBuilder()
    .setName("Copy to Builder")
    .setType(ApplicationCommandType.Message)
    .setContexts(
      InteractionContextType.BotDM,
      InteractionContextType.Guild,
      InteractionContextType.PrivateChannel,
    )
    .setIntegrationTypes(
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall,
    ),

  category: "Utility",
  botPermissions: ["ReadMessageHistory"],

  async execute(client, interaction) {
    if (!interaction.isMessageContextMenuCommand()) return;

    const target = interaction.targetMessage;

    try {
      const script = decompileMessageForBuilder(target, {
        clean: false,
      });

      const response = buildBuilderCopyContainer(script);

      await interaction.reply({
        ...response,
        flags: response.flags | MessageFlags.Ephemeral,
        allowedMentions: {
          parse: [],
        },
      });
    } catch (error) {
      await interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        allowedMentions: {
          parse: [],
        },
        components: [
          errorUI(
            error instanceof Error
              ? error.message
              : "Could not copy that message.",
          ),
        ],
      });
    }
  },
});
