import { MessageFlags, type Message } from "discord.js";

import { MessageCommand } from "@/classes/Command";
import { compileCv2Script } from "@/libs/scripting/cv2";
import {
  detectScriptKind,
  mergeMessageContent,
} from "@/libs/scripting/detectScriptKind";
import {
  compileEmbedScript,
  compileMultiEmbedScripts,
} from "@/libs/scripting/embed";
import { extractRawScript } from "@/libs/scripting/extractRawScript";
import { isScriptError } from "@/libs/scripting/common/ScriptError";
import { scheduleMessageDeletion } from "@/libs/scripting/scheduleMessageDeletion";
import { replaceVariables } from "@/libs/scripting/variables";
import errorUI from "@/ui/error";
import { LEADING_CHANNEL_MENTION } from "@/utils/constants";

export default new MessageCommand({
  name: "say",
  description: "Send a message as the bot to a channel.",
  category: "Moderation",
  guildOnly: true,
  botPermissions: ["SendMessages", "EmbedLinks"],
  userPermissions: ["ManageMessages"],

  arguments: [
    {
      name: "message",
      aliases: ["m"],
      type: "string",
      description:
        "Plain text, or an {embed}/{cv2} script. Optionally start with a #channel mention.",
      required: true,
    },
  ],

  async execute(client, message) {
    const raw = extractRawScript(message.content, client.prefix);

    if (!raw) {
      await replyError(client, message, "commands.say.missing_message");
      return;
    }

    let channel = message.channel;
    let body = raw;

    const mentionMatch = raw.match(LEADING_CHANNEL_MENTION);

    if (mentionMatch) {
      const channelId = mentionMatch[1]!;

      const targetChannel =
        message.guild?.channels.cache.get(channelId) ??
        (await message.guild?.channels.fetch(channelId).catch(() => null));

      if (!targetChannel) {
        await replyError(client, message, "commands.say.channel_not_found", {
          channel: channelId,
        });

        return;
      }

      channel = targetChannel as typeof message.channel;
      body = raw.slice(mentionMatch[0].length);
    }

    if (!body.trim()) {
      await replyError(client, message, "commands.say.empty_message");
      return;
    }

    if (!channel.isTextBased() || !("send" in channel)) {
      await replyError(client, message, "commands.say.invalid_channel");
      return;
    }

    body = replaceVariables(body, {
      user: message.author,
      guild: message.guild!,
      member: message.member,
    });

    let detected;
    try {
      detected = detectScriptKind(body);
    } catch (error) {
      if (isScriptError(error)) {
        await replyError(client, message, "commands.say.invalid_script", {
          error: error.message,
        });
        return;
      }
      throw error;
    }

    if (detected.kind === "text") {
      if (!detected.source.trim()) {
        await replyError(client, message, "commands.say.empty_message");
        return;
      }

      const sent = await channel.send(detected.source);
      scheduleMessageDeletion(sent, detected.deleteMs);
      return;
    }

    if (!detected.source && !detected.content) {
      await replyError(
        client,
        message,
        detected.kind === "embed"
          ? "commands.say.missing_embed"
          : "commands.say.missing_cv2",
      );

      return;
    }

    if (detected.kind === "embed" || detected.kind === "multi-embed") {
      if (!detected.source) {
        await replyError(client, message, "commands.say.missing_embed");
        return;
      }

      if (detected.kind === "multi-embed") {
        const compiled = compileMultiEmbedScripts(detected.source);

        if (!compiled.success) {
          await replyError(client, message, "commands.say.invalid_script", {
            error: compiled.error.message,
          });

          return;
        }

        const content = mergeMessageContent(
          detected.content,
          compiled.result.content,
        );

        const deleteMs = compiled.result.deleteMs ?? detected.deleteMs;

        const allComponents: (typeof compiled.result.embeds)[number]["components"] =
          [];
        const embeds = compiled.result.embeds.map((e) => {
          allComponents.push(...e.components);
          return e.embed;
        });

        const sent = await channel.send({
          ...(content ? { content } : {}),
          embeds,
          ...(allComponents.length > 0
            ? {
                components: allComponents,
              }
            : {}),
        });

        scheduleMessageDeletion(sent, deleteMs);
        return;
      }

      const compiled = compileEmbedScript(detected.source);

      if (!compiled.success) {
        await replyError(client, message, "commands.say.invalid_script", {
          error: compiled.error.message,
        });

        return;
      }

      const content = mergeMessageContent(
        detected.content,
        compiled.result.content,
      );

      const deleteMs = compiled.result.deleteMs ?? detected.deleteMs;

      const sent = await channel.send({
        ...(content ? { content } : {}),
        embeds: [compiled.result.embed],
        ...(compiled.result.components.length > 0
          ? {
              components: compiled.result.components,
            }
          : {}),
      });

      scheduleMessageDeletion(sent, deleteMs);
      return;
    }

    if (!detected.source) {
      await replyError(client, message, "commands.say.missing_cv2");
      return;
    }

    const compiled = compileCv2Script(detected.source, {
      prependText: detected.content,
    });

    if (!compiled.success) {
      await replyError(client, message, "commands.say.invalid_script", {
        error: compiled.error.message,
      });

      return;
    }

    const deleteMs = compiled.result.deleteMs ?? detected.deleteMs;

    const sent = await channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: compiled.result.components,
    });

    scheduleMessageDeletion(sent, deleteMs);
  },
});

async function replyError(
  client: {
    i18n: { t: (key: string, variables?: Record<string, unknown>) => string };
  },
  message: Message,
  key: string,
  variables?: Record<string, unknown>,
): Promise<void> {
  await message.reply({
    flags: MessageFlags.IsComponentsV2,
    components: [errorUI(client.i18n.t(key, variables))],
  });
}
