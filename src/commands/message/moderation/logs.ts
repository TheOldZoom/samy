import { MessageFlags, ChannelType, type Guild, type User } from "discord.js";
import { LogCategory } from "@prisma/client";
import { MessageCommand, MessageSubcommand } from "@/classes/Command";
import { Container, Text } from "@/ui/components";
import type Client from "@/classes/client";
import type { Message } from "discord.js";
import {
  LOG_CATEGORIES,
  isLogCategory,
  setLogChannel,
  setAllLogChannels,
  removeLogChannel,
  removeAllLogChannels,
  listLogChannels,
  resolveChannelLike,
  resolveTarget,
  mentionForTarget,
  addGlobalIgnore,
  removeGlobalIgnore,
  addTypeIgnore,
  removeTypeIgnore,
  type LogCategoryKey,
  type ChannelResolveError,
} from "@/commands/shared/logs";

function reply(message: Message, text: string) {
  return message.reply({
    flags: MessageFlags.IsComponentsV2,
    components: [new Container().text(Text(text))],
  });
}

function channelErrorMessage(client: Client, error: ChannelResolveError) {
  switch (error) {
    case "forum_parent":
      return client.i18n.t("commands.logs.forum_parent_error");
    case "invalid_type":
      return client.i18n.t("commands.logs.invalid_channel_type");
    default:
      return client.i18n.t("commands.logs.channel_not_found");
  }
}

function categoryArg(name = "category") {
  return {
    name,
    aliases: [],
    type: "string" as const,
    description: "One of: " + LOG_CATEGORIES.join(", "),
    required: true,
  };
}

function channelArg(name: string, description: string) {
  return {
    name,
    aliases:
      name === "channel"
        ? ["c"]
        : name === "source"
          ? ["s"]
          : name === "target"
            ? ["t"]
            : [],
    type: "string" as const,
    description,
    required: true,
  };
}

function makeAddSubcommand(category: LogCategoryKey, description: string) {
  return new MessageSubcommand({
    name: category,
    description,
    category: "Moderation",
    guildOnly: true,
    userPermissions: ["ManageGuild"],
    arguments: [
      channelArg(
        "channel",
        "The channel, thread, or forum post to send these logs to.",
      ),
    ],

    async execute(client, message, args) {
      const raw = args.getString("channel");
      if (!raw || !message.guild) {
        await reply(message, client.i18n.t("commands.logs.channel_not_found"));
        return;
      }

      const result = await resolveChannelLike(message.guild, raw, {
        strict: true,
      });
      if (!result.ok) {
        await reply(message, channelErrorMessage(client, result.error));
        return;
      }

      await setLogChannel(
        client,
        message.guild.id,
        category,
        result.channel.id,
      );

      await reply(
        message,
        client.i18n.t("commands.logs.add.success", {
          category,
          channel: result.channel.mention,
        }),
      );
    },
  });
}

function makeRemoveSubcommand(category: LogCategoryKey, description: string) {
  return new MessageSubcommand({
    name: category,
    description,
    category: "Moderation",
    guildOnly: true,
    userPermissions: ["ManageGuild"],

    async execute(client, message) {
      if (!message.guild) {
        await reply(message, client.i18n.t("commands.lockdown.guild_only"));
        return;
      }

      await removeLogChannel(client, message.guild.id, category);

      await reply(
        message,
        client.i18n.t("commands.logs.remove.success", { category }),
      );
    },
  });
}

export default new MessageCommand({
  name: "logs",
  description: "Configure server event logging.",
  category: "Moderation",
  guildOnly: true,
  aliases: ["logging"],

  async execute(client, message) {
    await runList(client, message);
  },

  subcommands: [
    new MessageSubcommand({
      name: "add",
      description: "Add logging for specific events.",
      category: "Moderation",
      guildOnly: true,

      subcommands: [
        new MessageSubcommand({
          name: "all",
          description: "Set all logging events to one channel.",
          category: "Moderation",
          guildOnly: true,
          userPermissions: ["ManageGuild"],
          arguments: [
            channelArg(
              "channel",
              "The channel, thread, or forum post to send all logs to.",
            ),
          ],

          async execute(client, message, args) {
            const raw = args.getString("channel");
            if (!raw || !message.guild) {
              await reply(
                message,
                client.i18n.t("commands.logs.channel_not_found"),
              );
              return;
            }

            const result = await resolveChannelLike(message.guild, raw, {
              strict: true,
            });
            if (!result.ok) {
              await reply(message, channelErrorMessage(client, result.error));
              return;
            }

            await setAllLogChannels(
              client,
              message.guild.id,
              result.channel.id,
            );

            await reply(
              message,
              client.i18n.t("commands.logs.add.all_success", {
                channel: result.channel.mention,
              }),
            );
          },
        }),

        makeAddSubcommand("channels", "Log channel related events."),
        makeAddSubcommand("guild", "Log guild related events."),
        makeAddSubcommand(
          "images",
          "Log deleted messages that contain images/attachments to their own channel.",
        ),
        makeAddSubcommand("members", "Log member related events."),
        makeAddSubcommand("messages", "Log message related events."),
        makeAddSubcommand("moderation", "Log moderation related events."),
        makeAddSubcommand("roles", "Log role related events."),
        makeAddSubcommand("voice", "Log voice related events."),
      ],
    }),

    new MessageSubcommand({
      name: "remove",
      description: "Remove logging for specific events.",
      category: "Moderation",
      guildOnly: true,

      subcommands: [
        new MessageSubcommand({
          name: "all",
          description: "Stop logging all events.",
          category: "Moderation",
          guildOnly: true,
          userPermissions: ["ManageGuild"],

          async execute(client, message) {
            if (!message.guild) {
              await reply(
                message,
                client.i18n.t("commands.lockdown.guild_only"),
              );
              return;
            }

            await removeAllLogChannels(client, message.guild.id);

            await reply(
              message,
              client.i18n.t("commands.logs.remove.all_success"),
            );
          },
        }),

        makeRemoveSubcommand(
          "channels",
          "Stop logging channel related events.",
        ),
        makeRemoveSubcommand("guild", "Stop logging guild related events."),
        makeRemoveSubcommand(
          "images",
          "Stop logging deleted images to a separate channel.",
        ),
        makeRemoveSubcommand("members", "Stop logging member related events."),
        makeRemoveSubcommand(
          "messages",
          "Stop logging message related events.",
        ),
        makeRemoveSubcommand(
          "moderation",
          "Stop logging moderation related events.",
        ),
        makeRemoveSubcommand("roles", "Stop logging role related events."),
        makeRemoveSubcommand("voice", "Stop logging voice related events."),
      ],
    }),

    new MessageSubcommand({
      name: "list",
      description: "List all the logging channels.",
      category: "Moderation",
      guildOnly: true,
      userPermissions: ["ManageGuild"],

      async execute(client, message) {
        await runList(client, message);
      },
    }),

    new MessageSubcommand({
      name: "ignore",
      description: "Manage the logging ignore list.",
      category: "Moderation",
      guildOnly: true,

      async execute(client, message) {
        await runIgnoreList(client, message);
      },

      subcommands: [
        new MessageSubcommand({
          name: "add",
          description:
            "Add a user, role or channel to the logging ignore list.",
          category: "Moderation",
          guildOnly: true,
          userPermissions: ["ManageGuild"],
          arguments: [
            {
              name: "target",
              aliases: ["t"],
              type: "string",
              description:
                "The user, role, channel, thread, or forum to ignore.",
              required: true,
            },
          ],

          async execute(client, message, args) {
            const raw = args.getString("target");
            if (!raw || !message.guild) {
              await reply(
                message,
                client.i18n.t("commands.logs.ignore.target_not_found"),
              );
              return;
            }

            const target = await resolveTarget(message.guild, raw);
            if (!target) {
              await reply(
                message,
                client.i18n.t("commands.logs.ignore.target_not_found"),
              );
              return;
            }

            await addGlobalIgnore(client, message.guild.id, target);

            await reply(
              message,
              client.i18n.t("commands.logs.ignore.add_success", {
                target: target.display,
              }),
            );
          },
        }),

        new MessageSubcommand({
          name: "list",
          description: "View the logging ignore list.",
          category: "Moderation",
          guildOnly: true,
          userPermissions: ["ManageGuild"],

          async execute(client, message) {
            await runIgnoreList(client, message);
          },
        }),

        new MessageSubcommand({
          name: "remove",
          description:
            "Remove a user, role or channel from the logging ignore list.",
          category: "Moderation",
          guildOnly: true,
          userPermissions: ["ManageGuild"],
          arguments: [
            {
              name: "target",
              aliases: ["t"],
              type: "string",
              description:
                "The user, role, channel, thread, or forum to stop ignoring.",
              required: true,
            },
          ],

          async execute(client, message, args) {
            const raw = args.getString("target");
            if (!raw || !message.guild) {
              await reply(
                message,
                client.i18n.t("commands.logs.ignore.target_not_found"),
              );
              return;
            }

            const target = await resolveTarget(message.guild, raw);
            if (!target) {
              await reply(
                message,
                client.i18n.t("commands.logs.ignore.target_not_found"),
              );
              return;
            }

            await removeGlobalIgnore(client, message.guild.id, target.id);

            await reply(
              message,
              client.i18n.t("commands.logs.ignore.remove_success", {
                target: target.display,
              }),
            );
          },
        }),

        new MessageSubcommand({
          name: "type",
          description: "Ignore a specific log type for a user or channel.",
          category: "Moderation",
          guildOnly: true,

          async execute(client, message) {
            await runTypeIgnoreList(client, message);
          },

          subcommands: [
            new MessageSubcommand({
              name: "add",
              description: "Ignore a user or channel for a single log type.",
              category: "Moderation",
              guildOnly: true,
              userPermissions: ["ManageGuild"],
              arguments: [
                categoryArg("log_type"),
                {
                  name: "target",
                  aliases: ["t"],
                  type: "string",
                  description:
                    "The user, role, channel, thread, or forum to ignore for this log type.",
                  required: true,
                },
              ],

              async execute(client, message, args) {
                const logType = args.getString("log_type");
                const raw = args.getString("target");

                if (!logType || !isLogCategory(logType)) {
                  await reply(
                    message,
                    client.i18n.t("commands.logs.invalid_category", {
                      categories: LOG_CATEGORIES.join(", "),
                    }),
                  );
                  return;
                }

                if (!raw || !message.guild) {
                  await reply(
                    message,
                    client.i18n.t("commands.logs.ignore.target_not_found"),
                  );
                  return;
                }

                const target = await resolveTarget(message.guild, raw);
                if (!target) {
                  await reply(
                    message,
                    client.i18n.t("commands.logs.ignore.target_not_found"),
                  );
                  return;
                }

                await addTypeIgnore(client, message.guild.id, target, logType);

                await reply(
                  message,
                  client.i18n.t("commands.logs.ignore.type_add_success", {
                    target: target.display,
                    category: logType,
                  }),
                );
              },
            }),

            new MessageSubcommand({
              name: "list",
              description: "View per-log-type ignores.",
              category: "Moderation",
              guildOnly: true,
              userPermissions: ["ManageGuild"],

              async execute(client, message) {
                await runTypeIgnoreList(client, message);
              },
            }),

            new MessageSubcommand({
              name: "remove",
              description:
                "Stop ignoring a user or channel for a single log type.",
              category: "Moderation",
              guildOnly: true,
              userPermissions: ["ManageGuild"],
              arguments: [
                categoryArg("log_type"),
                {
                  name: "target",
                  aliases: ["t"],
                  type: "string",
                  description:
                    "The user, role, channel, thread, or forum to stop ignoring.",
                  required: true,
                },
              ],

              async execute(client, message, args) {
                const logType = args.getString("log_type");
                const raw = args.getString("target");

                if (!logType || !isLogCategory(logType)) {
                  await reply(
                    message,
                    client.i18n.t("commands.logs.invalid_category", {
                      categories: LOG_CATEGORIES.join(", "),
                    }),
                  );
                  return;
                }

                if (!raw || !message.guild) {
                  await reply(
                    message,
                    client.i18n.t("commands.logs.ignore.target_not_found"),
                  );
                  return;
                }

                const target = await resolveTarget(message.guild, raw);
                if (!target) {
                  await reply(
                    message,
                    client.i18n.t("commands.logs.ignore.target_not_found"),
                  );
                  return;
                }

                await removeTypeIgnore(
                  client,
                  message.guild.id,
                  target.id,
                  logType,
                );

                await reply(
                  message,
                  client.i18n.t("commands.logs.ignore.type_remove_success", {
                    target: target.display,
                    category: logType,
                  }),
                );
              },
            }),
          ],
        }),
      ],
    }),

    new MessageSubcommand({
      name: "emit",
      description: "Manually emit test log events for all categories.",
      category: "Moderation",
      guildOnly: true,
      ownerOnly: true,
      arguments: [
        {
          name: "category",
          aliases: ["c"],
          type: "string",
          description: "The log category: " + LOG_CATEGORIES.join(", "),
          required: true,
        },
        {
          name: "description",
          aliases: ["d"],
          type: "string",
          description: "Optional description text.",
          required: false,
        },
        {
          name: "footer",
          aliases: ["f"],
          type: "string",
          description: "Optional footer text.",
          required: false,
        },
      ],

      async execute(client, message, args) {
        if (!client.config.devs.includes(message.author.id)) {
          await reply(message, client.i18n.t("commands.emit.unauthorized"));
          return;
        }

        const category = args.getString("category");

        if (!category) {
          await reply(
            message,
            client.i18n.t("commands.logs.invalid_category", {
              categories: LOG_CATEGORIES.join(", "),
            }),
          );
          return;
        }

        const categories: LogCategoryKey[] =
          category === "all"
            ? [...LOG_CATEGORIES]
            : isLogCategory(category)
              ? [category]
              : [];

        if (categories.length === 0) {
          await reply(
            message,
            client.i18n.t("commands.logs.invalid_category", {
              categories: LOG_CATEGORIES.join(", "),
            }),
          );
          return;
        }

        if (!message.guild) return;

        for (const cat of categories) {
          emitTestLogs(client, message.guild, cat, message.author);
        }

        await reply(
          message,
          client.i18n.t("commands.emit.emitted", {
            event: categories.length === 1 ? categories[0]! : "all",
            count: categories.length,
          }),
        );
      },
    }),
    new MessageSubcommand({
      name: "setup",
      description:
        "Create a logging category with a channel for every log event, and configure them automatically.",
      category: "Moderation",
      guildOnly: true,
      userPermissions: ["ManageGuild"],
      arguments: [
        {
          name: "name",
          aliases: ["n"],
          type: "string" as const,
          description: "Name for the new logging category. Defaults to 'Logs'.",
          required: false,
        },
      ],

      async execute(client, message, args) {
        if (!message.guild) {
          await reply(message, client.i18n.t("commands.lockdown.guild_only"));
          return;
        }

        const guild = message.guild;
        const categoryName = args.getString("name") || "Logs";

        const me = guild.members.me;
        if (
          !me?.permissions.has("ManageChannels") ||
          !me?.permissions.has("ManageRoles")
        ) {
          await reply(
            message,
            client.i18n.t("commands.logs.setup.missing_permissions"),
          );
          return;
        }

        await reply(message, client.i18n.t("commands.logs.setup.creating"));

        let logCategory;
        try {
          logCategory = await guild.channels.create({
            name: categoryName,
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
              {
                id: guild.roles.everyone.id,
                deny: ["ViewChannel"],
              },
            ],
          });
        } catch {
          await reply(
            message,
            client.i18n.t("commands.logs.setup.category_failed"),
          );
          return;
        }

        const created: { category: LogCategoryKey; channelId: string }[] = [];

        for (const category of LOG_CATEGORIES) {
          try {
            const channel = await guild.channels.create({
              name: `${category}-logs`,
              type: ChannelType.GuildText,
              parent: logCategory.id,
            });

            await setLogChannel(client, guild.id, category, channel.id);
            created.push({ category, channelId: channel.id });
          } catch {
            continue;
          }
        }

        if (created.length === 0) {
          await reply(message, client.i18n.t("commands.logs.setup.all_failed"));
          return;
        }

        const lines = created.map(
          (entry) => `- **${entry.category}** → <#${entry.channelId}>`,
        );

        await reply(
          message,
          client.i18n.t("commands.logs.setup.success", {
            category: logCategory.name,
            count: String(created.length),
            channels: lines.join("\n"),
          }),
        );
      },
    }),
  ],
});

function emitTestLogs(
  client: Client,
  guild: Guild,
  category: LogCategoryKey,
  author: User,
): void {
  switch (category) {
    case "channels":
      emitChannelEvents(client, guild, author);
      break;
    case "guild":
      emitGuildEvents(client, guild, author);
      break;
    case "images":
      emitImageEvents(client, guild, author);
      break;
    case "members":
      emitMemberEvents(client, guild, author);
      break;
    case "messages":
      emitMessageEvents(client, guild, author);
      break;
    case "moderation":
      emitModerationEvents(client, guild, author);
      break;
    case "roles":
      emitRoleEvents(client, guild, author);
      break;
    case "voice":
      emitVoiceEvents(client, guild, author);
      break;
  }
}

function emitChannelEvents(client: Client, guild: Guild, _author: User) {
  const channel = {
    guild,
    id: guild.id,
    name: "test-channel",
    type: 0,
    parentId: null,
    permissionOverwrites: { cache: new Map() },
    toString: () => `<#${guild.id}>`,
  };

  client.emit("channelCreate", channel);
  client.emit("channelDelete", channel);

  client.emit("channelUpdate", channel, {
    ...channel,
    name: "test-channel-2",
  });

  const thread = {
    guild,
    id: `thread-${Date.now()}`,
    name: "test-thread",
    type: 11,
    parentId: guild.id,
    archived: false,
    autoArchiveDuration: 60,
    locked: false,
    toString: () => `<#${guild.id}>`,
  };

  client.emit("threadCreate", thread);
  client.emit("threadDelete", thread);
  client.emit("threadUpdate", thread, {
    ...thread,
    name: "test-thread-2",
  });

  client.emit("webhookUpdate", {
    guild,
    id: guild.id,
    parentId: null,
  });

  const invite = {
    guild,
    code: "test-invite",
    channel: { toString: () => `<#${guild.id}>` },
    maxUses: 0,
    expiresAt: null,
    channelId: guild.id,
    inviterId: null,
  };

  client.emit("inviteCreate", invite);
  client.emit("inviteDelete", invite);
}

function emitGuildEvents(client: Client, guild: Guild, _author: User) {
  client.emit("guildCreate", guild);
  client.emit("guildDelete", guild);
  client.emit("guildUpdate", guild, {
    ...guild,
    name: `${guild.name}-2`,
  });
}

function emitImageEvents(client: Client, guild: Guild, author: User) {
  const emoji = {
    guild,
    id: `emoji-${Date.now()}`,
    name: "test-emoji",
    available: true,
    toString: () => `:${`test-emoji`}:`,
  };

  client.emit("emojiCreate", emoji);
  client.emit("emojiDelete", emoji);
  client.emit("emojiUpdate", emoji, {
    ...emoji,
    name: "test-emoji-2",
  });

  const sticker = {
    guild,
    guildId: guild.id,
    id: `sticker-${Date.now()}`,
    name: "test-sticker",
    description: null,
    tags: null,
  };

  client.emit("stickerCreate", sticker);
  client.emit("stickerDelete", sticker);
  client.emit("stickerUpdate", sticker, {
    ...sticker,
    name: "test-sticker-2",
  });

  const reaction = {
    emoji: { toString: () => "👍" },
    message: {
      guild,
      channelId: guild.id,
      id: `msg-${Date.now()}`,
      partial: false,
    },
    partial: false,
  };

  client.emit("messageReactionAdd", reaction, author);
  client.emit("messageReactionRemove", reaction, author);

  const message = {
    guild,
    channelId: guild.id,
    id: `msg-${Date.now()}`,
    partial: false,
  };

  client.emit("messageReactionRemoveAll", message);
}

function createFakeCollection<T>(entries: [string, T][] = []): Map<string, T> {
  const map = new Map(entries);
  return Object.assign(map, {
    filter: (fn: (value: T, key: string, map: Map<string, T>) => boolean) => {
      const result = new Map();
      for (const [key, value] of map) {
        if (fn(value, key, map)) result.set(key, value);
      }
      return createFakeCollection<T>([...result] as [string, T][]);
    },
    map: (fn: (value: T, key: string, map: Map<string, T>) => unknown) =>
      [...map].map(([key, value]) => fn(value, key, map)),
    find: (fn: (value: T, key: string, map: Map<string, T>) => boolean) => {
      for (const [key, value] of map) {
        if (fn(value, key, map)) return value;
      }
      return undefined;
    },
  });
}

function emitMemberEvents(client: Client, guild: Guild, author: User) {
  const member = {
    id: author.id,
    user: author,
    guild,
    nickname: null,
    roles: { cache: createFakeCollection() },
    displayAvatarURL: (opts?: { extension?: string; size?: number }) =>
      author.displayAvatarURL(opts),
    partial: false,
  };

  client.emit("guildMemberAdd", member);
  client.emit("guildMemberRemove", member);

  const member2 = {
    ...member,
    nickname: "TestNick",
    roles: {
      cache: createFakeCollection([
        [
          `role-${Date.now()}`,
          {
            id: `role-${Date.now()}`,
            name: "TestRole",
            hexColor: "#ff0000",
            hoist: false,
            mentionable: false,
            permissions: {
              equals: () => false,
              toArray: () => [],
              has: () => false,
            },
          },
        ],
      ]),
    },
  };

  client.emit("guildMemberUpdate", member, member2);
}

function emitMessageEvents(client: Client, guild: Guild, author: User) {
  const message = {
    id: `msg-${Date.now()}`,
    guild,
    channelId: guild.id,
    author,
    content: "test message",
    attachments: { size: 0, map: () => [] },
    partial: false,
  };

  client.emit("messageDelete", message);

  const messages = new Map([
    [message.id, message],
    [`msg-${Date.now() + 1}`, { ...message, id: `msg-${Date.now() + 1}` }],
  ]);

  client.emit("messageDeleteBulk", messages, { guild, id: guild.id });

  client.emit("messageUpdate", message, {
    ...message,
    content: "updated message",
  });
}

function emitModerationEvents(client: Client, guild: Guild, author: User) {
  const ban = {
    guild,
    userId: author.id,
    user: author,
    reason: "test reason",
    partial: false,
  };

  client.emit("guildBanAdd", ban);
  client.emit("guildBanRemove", ban);
}

function emitRoleEvents(client: Client, guild: Guild, _author: User) {
  const role = {
    guild,
    id: `role-${Date.now()}`,
    name: "test-role",
    hexColor: "#ff0000",
    hoist: false,
    mentionable: false,
    permissions: { equals: () => false, toArray: () => [], has: () => false },
    toString: () => `<@&${guild.id}>`,
  };

  client.emit("roleCreate", role);
  client.emit("roleDelete", role);
  client.emit("roleUpdate", role, { ...role, name: "test-role-2" });
}

function emitVoiceEvents(client: Client, guild: Guild, author: User) {
  const member = {
    id: author.id,
    user: author,
    guild,
    displayAvatarURL: (opts?: { extension?: string; size?: number }) =>
      author.displayAvatarURL(opts),
  };

  const oldState = {
    guild,
    channel: null,
    member,
    serverMute: false,
    serverDeaf: false,
    selfMute: false,
    selfDeaf: false,
    selfVideo: false,
    streaming: false,
  };

  const newState = {
    ...oldState,
    channel: { id: `voice-${Date.now()}`, toString: () => `<#${guild.id}>` },
  };

  client.emit("voiceStateUpdate", oldState, newState);

  const stageInstance = {
    guild,
    id: `stage-${Date.now()}`,
    topic: "Test Stage",
    channel: { toString: () => `<#${guild.id}>` },
    channelId: guild.id,
  };

  client.emit("stageInstanceCreate", stageInstance);
  client.emit("stageInstanceDelete", stageInstance);
}

async function runList(client: Client, message: Message) {
  if (!message.guild) {
    await reply(message, client.i18n.t("commands.lockdown.guild_only"));
    return;
  }

  const channels = await listLogChannels(client, message.guild.id);

  if (channels.length === 0) {
    await reply(message, client.i18n.t("commands.logs.list.none"));
    return;
  }

  const lines = channels.map(
    (entry) => `- **${entry.category.toLowerCase()}** → <#${entry.channelId}>`,
  );

  await reply(
    message,
    client.i18n.t("commands.logs.list.title", {
      count: String(channels.length),
      channels: lines.join("\n"),
    }),
  );
}

async function runIgnoreList(client: Client, message: Message) {
  if (!message.guild) {
    await reply(message, client.i18n.t("commands.lockdown.guild_only"));
    return;
  }

  const ignores = await client.prisma.logIgnore.findMany({
    where: { guildId: message.guild.id, category: LogCategory.ALL },
  });

  if (ignores.length === 0) {
    await reply(message, client.i18n.t("commands.logs.ignore.none"));
    return;
  }

  const lines = ignores.map((entry) => `- ${mentionForTarget(entry)}`);

  await reply(
    message,
    client.i18n.t("commands.logs.ignore.title", {
      count: String(ignores.length),
      targets: lines.join("\n"),
    }),
  );
}

async function runTypeIgnoreList(client: Client, message: Message) {
  if (!message.guild) {
    await reply(message, client.i18n.t("commands.lockdown.guild_only"));
    return;
  }

  const ignores = await client.prisma.logIgnore.findMany({
    where: { guildId: message.guild.id, NOT: { category: LogCategory.ALL } },
  });

  if (ignores.length === 0) {
    await reply(message, client.i18n.t("commands.logs.ignore.type_none"));
    return;
  }

  const lines = ignores.map(
    (entry) =>
      `- ${mentionForTarget(entry)} — **${entry.category.toLowerCase()}**`,
  );

  await reply(
    message,
    client.i18n.t("commands.logs.ignore.type_title", {
      count: String(ignores.length),
      targets: lines.join("\n"),
    }),
  );
}
