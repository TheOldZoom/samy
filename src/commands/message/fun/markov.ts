import { MessageFlags } from "discord.js";

import { MessageCommand, MessageSubcommand } from "@/classes/Command";
import { Container, Text } from "@/ui/components";
import type { TranslationVariables } from "@/libs/i18n";
import {
  getMarkovSettings,
  updateMarkovSettings,
  getChain,
  generateMarkov,
  clearChain,
  addMarkovChannel,
  removeMarkovChannel,
  listMarkovChannels,
} from "@/utils/markov";
import {
  MarkovGenerateResult,
  MarkovNoChainError,
  MarkovSeedNotFoundError,
  confirmMarkovAction,
} from "@/commands/shared/markov";

function simpleReply(
  message: { reply: (options: unknown) => unknown },
  text: string,
) {
  return message.reply({
    flags: MessageFlags.IsComponentsV2,
    components: [new Container().text(Text(text))],
  });
}

function i18nReply(
  message: {
    client: {
      i18n: { t: (key: string, vars?: TranslationVariables) => string };
    };
    reply: (options: unknown) => unknown;
  },
  key: string,
  vars?: TranslationVariables,
) {
  return simpleReply(message, message.client.i18n.t(key, vars));
}

export default new MessageCommand({
  name: "markov",
  description: "Markov chain text generation.",
  category: "Fun",
  guildOnly: true,

  subcommands: [
    new MessageSubcommand({
      name: "generate",
      description: "Generate a Markov chain sentence.",
      aliases: ["gen", "g"],

      arguments: [
        {
          name: "word",
          description: "A seed word to start the sentence from.",
          aliases: ["w", "seed"],
          type: "string",
          required: false,
        },
        {
          name: "length",
          description: "Maximum number of words to generate.",
          aliases: ["l", "max"],
          type: "string",
          required: false,
        },
      ],

      async execute(client, message, args) {
        const settings = await getMarkovSettings(message.guild!.id, client);

        const seed = args.getString("word") ?? undefined;
        const rawLength = args.getString("length");
        const maxWords = rawLength
          ? Math.min(parseInt(rawLength, 10) || settings.maxOutputLength, 100)
          : settings.maxOutputLength;

        const chain = await getChain(client, message.guild!.id);

        if (!chain) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [MarkovNoChainError(client)],
          });
          return;
        }

        const sentence = generateMarkov(
          chain,
          settings.chainOrder,
          seed,
          settings.minOutputLength,
          maxWords,
        );

        if (!sentence) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              seed
                ? MarkovSeedNotFoundError(client, seed)
                : MarkovNoChainError(client),
            ],
          });
          return;
        }

        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [MarkovGenerateResult(client, sentence)],
        });
      },
    }),

    new MessageSubcommand({
      name: "enable",
      description: "Enable Markov chain learning for this server.",
      userPermissions: ["ManageGuild"],

      async execute(client, message) {
        const settings = await getMarkovSettings(message.guild!.id, client);

        if (settings.enabled) {
          await i18nReply(message, "commands.markov.already_enabled");
          return;
        }

        await updateMarkovSettings(message.guild!.id, client, {
          enabled: true,
        });

        await i18nReply(message, "commands.markov.enabled");
      },
    }),

    new MessageSubcommand({
      name: "disable",
      description: "Disable Markov chain learning for this server.",
      userPermissions: ["ManageGuild"],

      async execute(client, message) {
        const settings = await getMarkovSettings(message.guild!.id, client);

        if (!settings.enabled) {
          await i18nReply(message, "commands.markov.already_disabled");
          return;
        }

        await updateMarkovSettings(message.guild!.id, client, {
          enabled: false,
        });

        await i18nReply(message, "commands.markov.disabled");
      },
    }),

    new MessageSubcommand({
      name: "mention",
      description:
        "Toggle replying with generated text when the bot is mentioned.",
      userPermissions: ["ManageGuild"],
      arguments: [
        {
          name: "state",
          description: "on or off",
          type: "string",
          required: true,
        },
      ],

      async execute(client, message, args) {
        const state = args.getString("state")?.toLowerCase();
        if (state !== "on" && state !== "off") {
          await i18nReply(message, "commands.markov.mention_usage");
          return;
        }

        await updateMarkovSettings(message.guild!.id, client, {
          mentionEnabled: state === "on",
        });

        await i18nReply(
          message,
          state === "on"
            ? "commands.markov.mention_on"
            : "commands.markov.mention_off",
        );
      },
    }),

    new MessageSubcommand({
      name: "random",
      description:
        "Toggle unprompted random Markov messages, with optional frequency/cooldown.",
      userPermissions: ["ManageGuild"],
      arguments: [
        {
          name: "state",
          description: "on or off",
          type: "string",
          required: true,
        },
        {
          name: "frequency",
          description: "1-in-N chance per eligible message (default 200).",
          aliases: ["freq"],
          type: "string",
          required: false,
        },
        {
          name: "cooldown",
          description: "Minimum seconds between random sends (default 300).",
          type: "string",
          required: false,
        },
      ],

      async execute(client, message, args) {
        const state = args.getString("state")?.toLowerCase();
        if (state !== "on" && state !== "off") {
          await i18nReply(message, "commands.markov.random_usage");
          return;
        }

        const patch: Record<string, boolean | number> = {
          randomEnabled: state === "on",
        };

        const rawFrequency = args.getString("frequency");
        if (rawFrequency) {
          const frequency = parseInt(rawFrequency, 10);
          if (Number.isFinite(frequency) && frequency > 0) {
            patch.randomFrequency = frequency;
          }
        }

        const rawCooldown = args.getString("cooldown");
        if (rawCooldown) {
          const cooldown = parseInt(rawCooldown, 10);
          if (Number.isFinite(cooldown) && cooldown >= 0) {
            patch.randomCooldown = cooldown;
          }
        }

        await updateMarkovSettings(message.guild!.id, client, patch);

        await i18nReply(
          message,
          state === "on"
            ? "commands.markov.random_on"
            : "commands.markov.random_off",
        );
      },
    }),

    new MessageSubcommand({
      name: "order",
      description:
        "Set the Markov chain order (1-4). Resets the learned chain.",
      userPermissions: ["ManageGuild"],
      arguments: [
        {
          name: "order",
          description:
            "Chain order, 1-4. Higher is more coherent but needs more data.",
          type: "string",
          required: true,
        },
      ],

      async execute(client, message, args) {
        const raw = args.getString("order");
        const order = raw ? parseInt(raw, 10) : NaN;

        if (!Number.isFinite(order) || order < 1 || order > 4) {
          await i18nReply(message, "commands.markov.order_invalid");
          return;
        }

        await confirmMarkovAction({
          client,
          message,
          confirmText: client.i18n.t("commands.markov.order_confirm", {
            order: String(order),
          }),
          onConfirm: async () => {
            await updateMarkovSettings(message.guild!.id, client, {
              chainOrder: order,
            });

            await clearChain(client, message.guild!.id);

            return client.i18n.t("commands.markov.order_success", {
              order: String(order),
            });
          },
        });
      },
    }),

    new MessageSubcommand({
      name: "length",
      description: "Set the min/max number of words generated.",
      userPermissions: ["ManageGuild"],
      arguments: [
        {
          name: "min",
          description: "Minimum words to try to generate.",
          type: "string",
          required: true,
        },
        {
          name: "max",
          description: "Maximum words to generate.",
          type: "string",
          required: true,
        },
      ],

      async execute(client, message, args) {
        const min = parseInt(args.getString("min") ?? "", 10);
        const max = parseInt(args.getString("max") ?? "", 10);

        if (
          !Number.isFinite(min) ||
          !Number.isFinite(max) ||
          min < 1 ||
          max < min ||
          max > 100
        ) {
          await i18nReply(message, "commands.markov.length_usage");
          return;
        }

        await updateMarkovSettings(message.guild!.id, client, {
          minOutputLength: min,
          maxOutputLength: max,
        });

        await i18nReply(message, "commands.markov.length_success", {
          min: String(min),
          max: String(max),
        });
      },
    }),

    new MessageSubcommand({
      name: "reset",
      description: "Reset the Markov chain data for this server.",
      userPermissions: ["ManageGuild"],

      async execute(client, message) {
        await confirmMarkovAction({
          client,
          message,
          confirmText: client.i18n.t("commands.markov.reset_confirm"),
          onConfirm: async () => {
            await clearChain(client, message.guild!.id);
            return client.i18n.t("commands.markov.reset_done");
          },
        });
      },
    }),

    new MessageSubcommand({
      name: "channel",
      description: "Manage channels the bot learns Markov messages from.",
      userPermissions: ["ManageGuild"],
      subcommands: [
        new MessageSubcommand({
          name: "add",
          description: "Allow Markov to learn from a channel.",
          userPermissions: ["ManageGuild"],
          arguments: [
            {
              name: "channel",
              aliases: ["c"],
              type: "channel",
              description: "The channel or category to whitelist.",
              required: true,
            },
          ],

          async execute(client, message, args) {
            const channel = args.getChannel("channel");

            if (!channel) {
              await i18nReply(message, "commands.markov.channel_not_found");
              return;
            }

            const added = await addMarkovChannel(
              message.guild!.id,
              channel.id,
              client,
            );

            await simpleReply(
              message,
              client.i18n.t(
                added
                  ? "commands.markov.channel_add"
                  : "commands.markov.channel_add_already",
                { channel: channel.toString() },
              ),
            );
          },
        }),

        new MessageSubcommand({
          name: "remove",
          description: "Stop Markov from learning in a channel.",
          userPermissions: ["ManageGuild"],
          arguments: [
            {
              name: "channel",
              aliases: ["c"],
              type: "channel",
              description:
                "The channel or category to remove from the whitelist.",
              required: true,
            },
          ],

          async execute(client, message, args) {
            const channel = args.getChannel("channel");

            if (!channel) {
              await i18nReply(message, "commands.markov.channel_not_found");
              return;
            }

            const removed = await removeMarkovChannel(
              message.guild!.id,
              channel.id,
              client,
            );

            await simpleReply(
              message,
              client.i18n.t(
                removed
                  ? "commands.markov.channel_remove"
                  : "commands.markov.channel_remove_not_found",
                { channel: channel.toString() },
              ),
            );
          },
        }),

        new MessageSubcommand({
          name: "list",
          description: "List channels Markov is learning from.",
          userPermissions: ["ManageGuild"],

          async execute(client, message) {
            const ids = await listMarkovChannels(message.guild!.id, client);

            if (ids.length === 0) {
              await i18nReply(message, "commands.markov.channel_list_none");
              return;
            }

            const lines = ids.map((id) => {
              const ch = message.guild!.channels.cache.get(id);
              const name = ch?.name ?? id;
              return `- <#${id}> (${name})`;
            });

            await simpleReply(
              message,
              client.i18n.t("commands.markov.channel_list_title", {
                count: String(ids.length),
                channels: lines.join("\n"),
              }),
            );
          },
        }),
      ],
    }),
  ],
});
