import { ChannelType, MessageFlags } from "discord.js";
import { MessageCommand, MessageSubcommand } from "@/classes/Command";
import { Container, Text } from "@/ui/components";
import { icons } from "@/utils/icons";
import { extractDuration, msToHuman } from "@/utils/duration";
import {
  getJailConfig,
  setJailRole,
  setJailChannel,
  setupJail,
  scheduleJail,
  clearJailTimer,
  ensureJailPermissions,
} from "@/utils/jail";
import { createModerationCase } from "@/utils/moderationCase";
import { deliverPunishmentDm, sendPunishmentResponse } from "@/utils/invoke";
import prisma from "@/libs/prisma";

export default new MessageCommand({
  name: "jail",
  description: "Isolate a member in the server jail.",
  aliases: ["prison"],
  category: "Moderation",
  guildOnly: true,
  userPermissions: ["ModerateMembers"],
  botPermissions: ["ManageRoles", "ManageChannels"],

  subcommands: [
    new MessageSubcommand({
      name: "setup",
      description:
        "Automatically set up or configure the jail role and channel.",
      userPermissions: ["Administrator"],
      botPermissions: ["ManageRoles", "ManageChannels"],
      cooldown: 30,
      arguments: [
        {
          name: "role",
          aliases: ["r"],
          type: "role",
          description: "Existing role to use as jail role (optional).",
          required: false,
        },
        {
          name: "channel",
          aliases: ["c"],
          type: "channelLike",
          description: "Existing channel to use as jail room (optional).",
          required: false,
        },
      ],
      async execute(client, message, args) {
        if (!message.guild) return;

        const role = args.getRole("role");
        const channelLike = args.getChannelLike("channel");
        const channel =
          channelLike && channelLike.isTextBased() ? channelLike : undefined;

        try {
          const result = await setupJail(message.guild, message.author, {
            role,
            channel,
          });

          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(
                  `${icons.Correct} ${client.i18n.t(
                    "commands.jail.setup_success",
                    {
                      role: result.role.id,
                      channel: result.channel.id,
                    },
                  )}`,
                ),
              ),
            ],
          });
        } catch (error) {
          client.logger.error("Failed to setup jail", { error });
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(
                  `${icons.Wrong} ${client.i18n.t("commands.jail.setup_failed")}`,
                ),
              ),
            ],
          });
        }
      },
    }),

    new MessageSubcommand({
      name: "role",
      description: "Set the jail role manually.",
      userPermissions: ["Administrator"],
      arguments: [
        {
          name: "role",
          aliases: ["r"],
          type: "role",
          description: "The role to use as the jail role.",
          required: true,
        },
      ],
      async execute(client, message, args) {
        if (!message.guild) return;

        const role = args.getRole("role");
        if (!role) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(
                  `${icons.warning} ${client.i18n.t("commands.jail.invalid_role")}`,
                ),
              ),
            ],
          });
          return;
        }

        await setJailRole(message.guild.id, role.id);

        const config = await getJailConfig(message.guild.id);
        let channel = message.guild.channels.cache.get(
          config.jailChannelId ?? "",
        );
        if (!channel || !channel.isTextBased()) {
          const botMember = message.guild.members.me;
          if (!botMember) return;

          const created = await message.guild.channels.create({
            name: "jail",
            type: ChannelType.GuildText,
            topic: "Jail room for restricted members.",
            permissionOverwrites: [
              {
                id: message.guild.roles.everyone.id,
                deny: ["ViewChannel"],
              },
              {
                id: role.id,
                allow: ["ViewChannel", "SendMessages", "ReadMessageHistory"],
              },
              {
                id: botMember.id,
                allow: [
                  "ViewChannel",
                  "SendMessages",
                  "ReadMessageHistory",
                  "ManageChannels",
                ],
              },
            ],
            reason: `Jail system setup by ${message.author.tag}`,
          });
          channel = created;
          await setJailChannel(message.guild.id, channel.id);
        } else {
          const botMember = message.guild.members.me;
          if (!botMember) return;
          await ensureJailPermissions(message.guild, role, channel, botMember);
        }

        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(
                `${icons.Correct} ${client.i18n.t(
                  "commands.jail.role_success",
                  {
                    role: role.id,
                  },
                )}`,
              ),
            ),
          ],
        });
      },
    }),

    new MessageSubcommand({
      name: "channel",
      description: "Set the jail channel manually.",
      userPermissions: ["Administrator"],
      arguments: [
        {
          name: "channel",
          aliases: ["c"],
          type: "channelLike",
          description: "The channel to use as the jail room.",
          required: true,
        },
      ],
      async execute(client, message, args) {
        if (!message.guild) return;

        const channel = args.getChannelLike("channel");
        if (!channel || !channel.isTextBased()) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(
                  `${icons.warning} ${client.i18n.t("commands.jail.invalid_channel")}`,
                ),
              ),
            ],
          });
          return;
        }

        await setJailChannel(message.guild.id, channel.id);

        const config = await getJailConfig(message.guild.id);
        let role = message.guild.roles.cache.get(config.jailRoleId ?? "");
        if (!role) {
          role = await message.guild.roles.create({
            name: "Jailed",
            permissions: [],
            reason: `Jail system setup by ${message.author.tag}`,
          });
          await setJailRole(message.guild.id, role.id);
        }

        const botMember = message.guild.members.me;
        if (!botMember) return;

        await ensureJailPermissions(message.guild, role, channel, botMember);

        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(
                `${icons.Correct} ${client.i18n.t(
                  "commands.jail.channel_success",
                  {
                    channel: channel.id,
                  },
                )}`,
              ),
            ),
          ],
        });
      },
    }),

    new MessageSubcommand({
      name: "view",
      aliases: ["config", "info"],
      description: "View the server's jail configuration.",
      userPermissions: ["ModerateMembers"],
      async execute(client, message) {
        if (!message.guild) return;

        const config = await getJailConfig(message.guild.id);
        const count = await prisma.jailedMember.count({
          where: { guildId: message.guild.id },
        });

        const roleText = config.jailRoleId
          ? `<@&${config.jailRoleId}>`
          : "*Not configured*";
        const channelText = config.jailChannelId
          ? `<#${config.jailChannelId}>`
          : "*Not configured*";

        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(
                client.i18n.t("commands.jail.view_title", {
                  roleText,
                  channelText,
                  count,
                  footer:
                    config.jailRoleId && config.jailChannelId
                      ? client.i18n.t("commands.jail.view_active")
                      : client.i18n.t("commands.jail.view_inactive"),
                }),
              ),
            ),
          ],
        });
      },
    }),

    new MessageSubcommand({
      name: "list",
      aliases: ["members"],
      description: "List all currently jailed members.",
      userPermissions: ["ModerateMembers"],
      async execute(client, message) {
        if (!message.guild) return;

        const jailed = await prisma.jailedMember.findMany({
          where: { guildId: message.guild.id },
          orderBy: { createdAt: "desc" },
          take: 25,
        });

        if (jailed.length === 0) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(
                  `${icons.info} ${client.i18n.t("commands.jail.list_empty")}`,
                ),
              ),
            ],
          });
          return;
        }

        const lines = jailed.map((j) => {
          const expiry = j.expiresAt
            ? `Expires <t:${Math.floor(j.expiresAt.getTime() / 1000)}:R>`
            : "Permanent";
          return `• <@${j.userId}> — ${j.reason || "No reason"} (${expiry})`;
        });

        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(
                client.i18n.t("commands.jail.list_title", {
                  count: jailed.length,
                  lines: lines.join("\n"),
                }),
              ),
            ),
          ],
        });
      },
    }),
  ],

  arguments: [
    {
      name: "user",
      aliases: ["u", "member", "target"],
      type: "user",
      description: "The user to jail.",
      required: true,
    },
    {
      name: "reason",
      aliases: ["r"],
      type: "string",
      description:
        "Optional duration (e.g. 1h, 1d) followed by a reason. E.g. `1h spamming`.",
      required: false,
      default: "No reason provided.",
    },
  ],

  async execute(client, message, args) {
    if (!message.guild) return;

    const target = args.getUser("user");
    if (!target) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.locked +
                " " +
                client.i18n.t("commands.jail.user_not_found"),
            ),
          ),
        ],
      });
      return;
    }

    if (target.id === message.author.id) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(icons.locked + " " + client.i18n.t("commands.jail.self")),
          ),
        ],
      });
      return;
    }

    if (target.id === client.user?.id) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(icons.locked + " " + client.i18n.t("commands.jail.bot")),
          ),
        ],
      });
      return;
    }

    const member =
      message.guild.members.cache.get(target.id) ??
      (await message.guild.members.fetch(target.id).catch(() => null));

    if (!member) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.locked + " " + client.i18n.t("commands.jail.not_in_guild"),
            ),
          ),
        ],
      });
      return;
    }

    const authorMember = message.member;
    if (
      authorMember &&
      authorMember.roles.highest.position <= member.roles.highest.position &&
      message.guild.ownerId !== message.author.id
    ) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.locked +
                " " +
                client.i18n.t("commands.jail.role_hierarchy"),
            ),
          ),
        ],
      });
      return;
    }

    const botMember = message.guild.members.me;
    if (
      botMember &&
      botMember.roles.highest.position <= member.roles.highest.position
    ) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.locked + " " + client.i18n.t("commands.jail.bot_hierarchy"),
            ),
          ),
        ],
      });
      return;
    }

    const jailConfig = await getJailConfig(message.guild.id);
    if (!jailConfig.jailRoleId || !jailConfig.jailChannelId) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              `${icons.warning} ${client.i18n.t("commands.jail.not_configured")}`,
            ),
          ),
        ],
      });
      return;
    }

    const jailRole = message.guild.roles.cache.get(jailConfig.jailRoleId);
    if (!jailRole) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              `${icons.warning} ${client.i18n.t("commands.jail.role_missing")}`,
            ),
          ),
        ],
      });
      return;
    }

    const existingJail = await prisma.jailedMember.findUnique({
      where: {
        guildId_userId: {
          guildId: message.guild.id,
          userId: target.id,
        },
      },
    });

    if (existingJail) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.locked +
                " " +
                client.i18n.t("commands.jail.already_jailed"),
            ),
          ),
        ],
      });
      return;
    }

    const rawReason = args.getString("reason") ?? "No reason provided.";
    const { durationMs, rest } = extractDuration(rawReason);
    const reason =
      durationMs !== null ? rest || "No reason provided." : rawReason;

    const rolesToStrip = member.roles.cache.filter(
      (r) => r.id !== message.guild!.id && !r.managed && r.id !== jailRole.id,
    );
    const roleIds = [...rolesToStrip.keys()];

    try {
      await member.roles.set([jailRole.id], `${message.author.tag}: ${reason}`);
    } catch (error) {
      client.logger.error("Failed to apply jail role", { error });
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(icons.locked + " " + client.i18n.t("commands.jail.failed")),
          ),
        ],
      });
      return;
    }

    const expiresAt =
      durationMs !== null ? new Date(Date.now() + durationMs) : null;

    const jailedRecord = await prisma.jailedMember.create({
      data: {
        guildId: message.guild.id,
        userId: target.id,
        roles: JSON.stringify(roleIds),
        reason,
        moderatorId: message.author.id,
        expiresAt,
      },
    });

    if (expiresAt) {
      scheduleJail(client, jailedRecord);
    } else {
      clearJailTimer(message.guild.id, target.id);
    }

    const caseNumber = await createModerationCase({
      guildId: message.guild.id,
      type: "jail",
      userId: target.id,
      moderatorId: message.author.id,
      reason,
      duration: durationMs,
      expiresAt,
    });

    const durationStr = durationMs !== null ? msToHuman(durationMs) : null;

    const jailChannel = message.guild.channels.cache.get(
      jailConfig.jailChannelId ?? "",
    );

    await deliverPunishmentDm({
      guild: message.guild,
      target,
      action: "jail",
      moderator: message.author,
      reason,
      duration: durationStr ?? undefined,
      caseNumber,
      fallback: async () => {
        await target.send({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(
                durationStr !== null
                  ? client.i18n.t("commands.jail.dm_temp", {
                      guild: message.guild!.name,
                      duration: durationStr,
                      reason,
                    })
                  : client.i18n.t("commands.jail.dm", {
                      guild: message.guild!.name,
                      reason,
                    }),
              ),
            ),
          ],
        });
      },
    });

    await sendPunishmentResponse({
      message,
      target,
      action: "jail",
      moderator: message.author,
      reason,
      duration: durationStr ?? undefined,
      caseNumber,
      fallback: async () => {
        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(
                durationStr !== null
                  ? client.i18n.t("commands.jail.success_temp", {
                      user: target.tag,
                      duration: durationStr,
                      reason,
                    })
                  : client.i18n.t("commands.jail.success", {
                      user: target.tag,
                      reason,
                    }),
              ),
            ),
          ],
        });
      },
    });

    if (jailChannel?.isTextBased()) {
      await sendPunishmentResponse({
        message,
        target,
        action: "jail",
        moderator: message.author,
        reason,
        duration: durationStr ?? undefined,
        caseNumber,
        channel: jailChannel,
        fallback: async () => {
          await jailChannel.send({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(
                  durationStr !== null
                    ? client.i18n.t("commands.jail.jail_channel_temp", {
                        user: target.tag,
                        duration: durationStr,
                        reason,
                      })
                    : client.i18n.t("commands.jail.jail_channel", {
                        user: target.tag,
                        reason,
                      }),
                ),
              ),
            ],
          });
        },
      });
    }
  },
});
