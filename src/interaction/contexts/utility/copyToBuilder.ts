import {
  ApplicationCommandType,
  ApplicationIntegrationType,
  codeBlock,
  ContextMenuCommandBuilder,
  InteractionContextType,
  type APIMessageTopLevelComponent,
} from "discord.js";

import { ContextCommand } from "@/classes/Command";
import { decompileMessageToScript } from "@/libs/scripting";
import { icons } from "@/utils/icons";
import { Container, Text, v2 } from "@/utils/ui/components";

const MAX_SCRIPT_LENGTH = 3_800;

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

  async execute(_client, interaction) {
    if (!interaction.isMessageContextMenuCommand()) return;

    try {
      const target = interaction.targetMessage;
      const script = decompileMessageToScript(
        {
          content: target.content,
          embeds: target.embeds.map((embed) => embed.toJSON()),
          components: target.components.map(
            (component) => component.toJSON() as APIMessageTopLevelComponent,
          ),
        },
        { clean: true },
      );

      if (!script.trim()) {
        throw new Error("That message has no supported content to copy.");
      }

      if (script.length > MAX_SCRIPT_LENGTH) {
        throw new Error("That message is too large to copy into the builder.");
      }

      await interaction.reply({
        ...v2(
          new Container().text(
            Text(`-# ${icons.code} · Copy to Builder\n${codeBlock(script)}`),
          ),
        ),
        ephemeral: true,
        allowedMentions: { parse: [] },
      });
    } catch (error) {
      await interaction.reply({
        ...v2(
          new Container().text(
            Text(
              `-# ${icons.Wrong} · Copy to Builder\n${
                error instanceof Error
                  ? error.message
                  : "Could not copy that message."
              }`,
            ),
          ),
        ),
        ephemeral: true,
        allowedMentions: { parse: [] },
      });
    }
  },
});
