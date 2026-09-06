import { MessageFlags } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand, MessageSubcommand } from "@/classes/Command";
import {
  buildBuilderCopyContainer,
  decompileMessageForBuilder,
  fetchBuilderCopyTarget,
} from "@/commands/shared/builderCopy";
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

export default new MessageCommand({
  name: "builder",
  aliases: ["build", "b", "embed", "cv2", "componentsv2", "e"],
  description: "Build and send a text, embed, or Components V2 message.",
  category: "Utility",

  arguments: [
    {
      name: "message",
      aliases: ["m"],
      type: "string",
      description: "Plain text, an {embed} script, or a {cv2} script.",
      required: true,
    },
  ],

  subcommands: [
    new MessageSubcommand({
      name: "copy",
      aliases: ["info", "source"],
      description: "Copy a message into builder script syntax.",

      arguments: [
        {
          name: "message",
          aliases: ["link", "url"],
          type: "string",
          description:
            "A Discord message link. You can also reply to a message.",
          required: false,
        },
        {
          name: "clean",
          aliases: ["c"],
          type: "boolean",
          description: "Show actual line breaks instead of \\n.",
          required: false,
        },
      ],

      botPermissions: ["SendMessages", "ReadMessageHistory"],

      async execute(client, message, args) {
        const target = await fetchBuilderCopyTarget(client, {
          link: args.getString("message"),
          reply: message,
          guildId: message.guildId,
        });

        if (!target) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            allowedMentions: {
              parse: [],
            },
            components: [
              errorUI(
                "Reply to a message or provide a valid Discord message link.",
              ),
            ],
          });

          return;
        }

        try {
          const script = decompileMessageForBuilder(target, {
            clean: args.getBoolean("clean"),
          });

          await message.reply({
            ...buildBuilderCopyContainer(script),
            allowedMentions: {
              parse: [],
            },
          });
        } catch (error) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
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
    }),
  ],

  botPermissions: ["SendMessages", "EmbedLinks", "ReadMessageHistory"],

  async execute(client, message) {
    const raw = extractRawScript(message.content, client.prefix);

    if (!raw) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: {
          parse: [],
        },
        components: [
          errorUI(
            icons.code +
              " " +
              client.i18n.t("commands.builder.provide_message"),
          ),
        ],
      });

      return;
    }

    const member = message.guild
      ? (message.guild.members.cache.get(message.author.id) ??
        (await message.guild.members.fetch(message.author.id)))
      : null;

    const script = replaceVariables(raw, {
      user: message.author,
      guild: message.guild,
      member,
    });

    let detected;

    try {
      detected = detectScriptKind(script);
    } catch (error) {
      if (isScriptError(error)) {
        await message.reply({
          flags: MessageFlags.IsComponentsV2,
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
      const sent = await message.reply({
        content: detected.source,
        allowedMentions: {
          parse: [],
        },
      });

      scheduleMessageDeletion(sent, detected.deleteMs);

      return;
    }

    if (!detected.source && !detected.content) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
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

    if (detected.kind === "embed" || detected.kind === "multi-embed") {
      if (!detected.source) {
        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: {
            parse: [],
          },
          components: [
            errorUI(
              icons.code +
                " " +
                client.i18n.t("commands.builder.missing_embed_example"),
            ),
          ],
        });

        return;
      }

      if (detected.kind === "multi-embed") {
        const compiled = compileMultiEmbedScripts(detected.source);

        if (!compiled.success) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
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

        const allComponents: (typeof compiled.result.embeds)[number]["components"] =
          [];
        const embeds = compiled.result.embeds.map((e) => {
          allComponents.push(...e.components);
          return e.embed;
        });

        const sent = await message.reply({
          ...(content ? { content } : {}),
          allowedMentions: {
            parse: [],
          },
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
        await message.reply({
          flags: MessageFlags.IsComponentsV2,
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

      const sent = await message.reply({
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

      scheduleMessageDeletion(sent, deleteMs);

      return;
    }

    if (!detected.source) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: {
          parse: [],
        },
        components: [
          errorUI(
            icons.code +
              " " +
              client.i18n.t("commands.builder.missing_cv2_example"),
          ),
        ],
      });

      return;
    }

    const compiled = compileCv2Script(detected.source, {
      prependText: detected.content,
    });

    if (!compiled.success) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: {
          parse: [],
        },
        components: [errorUI(compiled.error.message)],
      });

      return;
    }

    const deleteMs = compiled.result.deleteMs ?? detected.deleteMs;

    const sent = await message.reply({
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: {
        parse: [],
      },
      components: compiled.result.components,
    });

    scheduleMessageDeletion(sent, deleteMs);
  },
});
