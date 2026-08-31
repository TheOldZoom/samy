import {
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import { icons } from "@/utils/icons";

import { SlashCommand } from "@/classes/Command";
import { compileCv2Script } from "@/libs/scripting/cv2";
import {
  detectScriptKind,
  mergeMessageContent,
} from "@/libs/scripting/detectScriptKind";
import { compileEmbedScript } from "@/libs/scripting/embed";
import { isScriptError } from "@/libs/scripting/common/ScriptError";
import { scheduleMessageDeletion } from "@/libs/scripting/scheduleMessageDeletion";
import { replaceVariables } from "@/libs/scripting/variables";
import errorUI from "@/ui/error";

export default new SlashCommand({
  data: new SlashCommandBuilder()
    .setName("builder")
    .setDescription("Build and send a text, embed, or Components V2 message.")
    .addStringOption((option) =>
      option
        .setName("script")
        .setDescription("Plain text, an {embed} script, or a {cv2} script.")
        .setRequired(true),
    )
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
  botPermissions: ["SendMessages", "EmbedLinks", "ReadMessageHistory"],

  async execute(client, interaction) {
    const raw = interaction.options.getString("script", true).trim();

    const member = interaction.guild
      ? (interaction.guild.members.cache.get(interaction.user.id) ??
        (await interaction.guild.members.fetch(interaction.user.id)))
      : null;

    const script = replaceVariables(raw, {
      user: interaction.user,
      guild: interaction.guild,
      member,
    });

    let detected;
    try {
      detected = detectScriptKind(script);
    } catch (error) {
      if (isScriptError(error)) {
        await interaction.reply({
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          allowedMentions: {
            parse: [],
          },
          components: [errorUI(error.message)],
        });
        return;
      }
      throw error;
    }

    if (detected.kind === "text") {
      const response = await interaction.reply({
        content: detected.source,
        allowedMentions: {
          parse: [],
        },
      });
      scheduleMessageDeletion(response, detected.deleteMs);
      return;
    }

    if (!detected.source && !detected.content) {
      await interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        allowedMentions: {
          parse: [],
        },
        components: [
          errorUI(
            detected.kind === "embed"
              ? client.i18n.t("commands.builder.missing_embed")
              : client.i18n.t("commands.builder.missing_cv2"),
          ),
        ],
      });

      return;
    }

    if (detected.kind === "embed") {
      if (!detected.source) {
        await interaction.reply({
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          allowedMentions: {
            parse: [],
          },
          components: [
            errorUI(icons.code + " " + client.i18n.t("commands.builder.missing_embed_example")),
          ],
        });

        return;
      }

      const compiled = compileEmbedScript(detected.source);

      if (!compiled.success) {
        await interaction.reply({
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          allowedMentions: {
            parse: [],
          },
          components: [errorUI(compiled.error.message)],
        });

        return;
      }

      const content = mergeMessageContent(
        detected.content,
        compiled.result.content,
      );

      const deleteMs = compiled.result.deleteMs ?? detected.deleteMs;

      const response = await interaction.reply({
        ...(content ? { content } : {}),
        allowedMentions: {
          parse: [],
        },
        embeds: [compiled.result.embed],
        ...(compiled.result.components.length > 0
          ? {
              components: compiled.result.components,
            }
          : {}),
      });

      scheduleMessageDeletion(response, deleteMs);
      return;
    }

    if (!detected.source) {
      await interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        allowedMentions: {
          parse: [],
        },
        components: [
          errorUI(icons.code + " " + client.i18n.t("commands.builder.missing_cv2_example")),
        ],
      });

      return;
    }

    const compiled = compileCv2Script(detected.source, {
      prependText: detected.content,
    });

    if (!compiled.success) {
      await interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        allowedMentions: {
          parse: [],
        },
        components: [errorUI(compiled.error.message)],
      });

      return;
    }

    const deleteMs = compiled.result.deleteMs ?? detected.deleteMs;

    const response = await interaction.reply({
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: {
        parse: [],
      },
      components: compiled.result.components,
    });

    scheduleMessageDeletion(response, deleteMs);
  },
});
