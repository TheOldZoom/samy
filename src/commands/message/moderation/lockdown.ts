import { ChannelType, GuildChannel, MessageFlags } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand, MessageSubcommand } from "@/classes/Command";
import { Container, Text } from "@/ui/components";
import type Client from "@/classes/client";
import type { Message } from "discord.js";
import {
  toggleChannelOverwrites,
  ensureBotCanAnnounce,
  announceChannelState,
  resolveLockdownTargets,
} from "@/commands/shared/lockdown";

interface RunLockdownOptions {
  reason?: string;
  forceState?: boolean;
}

async function runLockdown(
  client: Client,
  message: Message,
  { reason, forceState }: RunLockdownOptions,
): Promise<void> {
  if (!message.guild) {
    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(icons.locked + " " + client.i18n.t("commands.lockdown.guild_only")),
        ),
      ],
    });

    return;
  }

  const guild = message.guild;
  const guildId = guild.id;

  const botMember = guild.members.me;

  const channels = await client.prisma.lockdownChannel.findMany({
    where: { guildId },
    orderBy: { createdAt: "desc" },
  });

  if (channels.length === 0) {
    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(icons.locked + " " + client.i18n.t("commands.lockdown.no_channels", {
              command: `${client.prefix}lockdown`,
            }),
          ),
        ),
      ],
    });

    return;
  }

  const roles = await client.prisma.lockdownRole.findMany({
    where: { guildId },
    orderBy: { createdAt: "desc" },
  });

  const roleIds = roles.map((r) => r.roleId);

  let lockdownState = await client.prisma.lockdown.findUnique({
    where: { guildId },
  });

  if (!lockdownState) {
    await client.prisma.guild.upsert({
      where: { id: guildId },
      update: {},
      create: { id: guildId },
    });

    lockdownState = await client.prisma.lockdown.create({
      data: { guildId, active: false },
    });
  }

  const lock = forceState ?? !lockdownState.active;

  let successes = 0;
  let failures = 0;

  for (const entry of channels) {
    const channel = guild.channels.cache.get(entry.channelId);

    if (!channel || !(channel instanceof GuildChannel)) {
      failures++;
      continue;
    }

    const isCategory = channel.type === ChannelType.GuildCategory;
    const targets = resolveLockdownTargets(channel);

    try {
      if (isCategory) {
        await toggleChannelOverwrites(channel, guildId, roleIds, lock, reason);
      }

      for (const target of targets) {
        if (botMember) {
          await ensureBotCanAnnounce(target, botMember.id, reason);
        }

        if (lock) {
          await announceChannelState(client, target, true, reason);
          await toggleChannelOverwrites(target, guildId, roleIds, true, reason);
        } else {
          await toggleChannelOverwrites(
            target,
            guildId,
            roleIds,
            false,
            reason,
          );
          await announceChannelState(client, target, false, reason);
        }
      }

      successes++;
    } catch {
      failures++;
    }
  }

  await client.prisma.lockdown.update({
    where: { guildId },
    data: { active: lock },
  });

  if (failures > 0 && successes === 0) {
    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(icons.locked + " " + client.i18n.t("commands.lockdown.failed", {
              count: String(channels.length),
              noun: channels.length === 1 ? "channel" : "channels",
            }),
          ),
        ),
      ],
    });

    return;
  }

  if (!lock) {
    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(icons.locked + " " + client.i18n.t("commands.lockdown.unlocking", {
              count: String(successes),
              noun: successes === 1 ? "channel" : "channels",
            }),
          ),
        ),
      ],
    });

    return;
  }

  if (roleIds.length > 0) {
    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(icons.locked + " " + client.i18n.t("commands.lockdown.locking_roles", {
              count: String(successes),
              noun: successes === 1 ? "channel" : "channels",
              roles: String(roleIds.length),
              rolesNoun: roleIds.length === 1 ? "role" : "roles",
            }),
          ),
        ),
      ],
    });

    return;
  }

  await message.reply({
    flags: MessageFlags.IsComponentsV2,
    components: [
      new Container().text(
        Text(icons.locked + " " + client.i18n.t("commands.lockdown.locking", {
            count: String(successes),
            noun: successes === 1 ? "channel" : "channels",
          }),
        ),
      ),
    ],
  });
}

export default new MessageCommand({
  name: "lockdown",
  description: "Manage server-wide lockdown settings.",
  category: "Moderation",
  guildOnly: true,
  userPermissions: ["ManageGuild"],
  botPermissions: ["ManageChannels", "ManageRoles"],

  arguments: [
    {
      name: "reason",
      aliases: ["r"],
      type: "string",
      description: "Reason for the lockdown, shown in each channel.",
      required: false,
    },
  ],

  async execute(client, message, args) {
    await runLockdown(client, message, {
      reason: args.getString("reason") ?? undefined,
    });
  },

  subcommands: [
    new MessageSubcommand({
      name: "on",
      description: "Force the lockdown on, even if it's already active.",
      category: "Moderation",
      guildOnly: true,
      userPermissions: ["ManageGuild"],
      botPermissions: ["ManageChannels", "ManageRoles"],
      arguments: [
        {
          name: "reason",
          aliases: ["r"],
          type: "string",
          description: "Reason for the lockdown, shown in each channel.",
          required: false,
        },
      ],

      async execute(client, message, args) {
        await runLockdown(client, message, {
          reason: args.getString("reason") ?? undefined,
          forceState: true,
        });
      },
    }),

    new MessageSubcommand({
      name: "off",
      description: "Force the lockdown off, even if it's already inactive.",
      category: "Moderation",
      guildOnly: true,
      userPermissions: ["ManageGuild"],
      botPermissions: ["ManageChannels", "ManageRoles"],
      arguments: [
        {
          name: "reason",
          aliases: ["r"],
          type: "string",
          description: "Reason shown in each channel when lifting lockdown.",
          required: false,
        },
      ],

      async execute(client, message, args) {
        await runLockdown(client, message, {
          reason: args.getString("reason") ?? undefined,
          forceState: false,
        });
      },
    }),

    new MessageSubcommand({
      name: "channel",
      description: "Manage lockdown channel settings.",
      category: "Moderation",
      guildOnly: true,

      subcommands: [
        new MessageSubcommand({
          name: "add",
          description: "Add a channel to the lockdown channel list.",
          category: "Moderation",
          guildOnly: true,
          userPermissions: ["ManageGuild"],
          arguments: [
            {
              name: "channel",
              aliases: ["c"],
              type: "channel",
              description: "The channel to add to the lockdown list.",
              required: true,
            },
          ],

          async execute(client, message, args) {
            const channel = args.getChannel("channel");

            if (!channel || !message.guild) {
              await message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                  new Container().text(
                    Text(icons.locked + " " + client.i18n.t(
                        "commands.lockdown.channel.add.channel_not_found",
                      ),
                    ),
                  ),
                ],
              });

              return;
            }

            try {
              await client.prisma.guild.upsert({
                where: { id: message.guild.id },
                update: {},
                create: { id: message.guild.id },
              });

              const existing = await client.prisma.lockdownChannel.findUnique({
                where: {
                  guildId_channelId: {
                    guildId: message.guild.id,
                    channelId: channel.id,
                  },
                },
              });

              if (existing) {
                await message.reply({
                  flags: MessageFlags.IsComponentsV2,
                  components: [
                    new Container().text(
                      Text(icons.locked + " " + client.i18n.t(
                          "commands.lockdown.channel.add.already_added",
                          {
                            channel: channel.toString(),
                          },
                        ),
                      ),
                    ),
                  ],
                });

                return;
              }

              await client.prisma.lockdownChannel.create({
                data: {
                  guildId: message.guild.id,
                  channelId: channel.id,
                },
              });

              await message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                  new Container().text(
                    Text(icons.locked + " " + client.i18n.t("commands.lockdown.channel.add.success", {
                        channel: channel.toString(),
                      }),
                    ),
                  ),
                ],
              });
            } catch {
              await message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                  new Container().text(
                    Text(icons.locked + " " + client.i18n.t("commands.lockdown.channel.add.failed")),
                  ),
                ],
              });
            }
          },
        }),

        new MessageSubcommand({
          name: "list",
          description: "List all channels in the lockdown channel list.",
          category: "Moderation",
          guildOnly: true,
          userPermissions: ["ManageGuild"],

          async execute(client, message) {
            if (!message.guild) {
              await message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                  new Container().text(
                    Text(icons.locked + " " + client.i18n.t("commands.lockdown.guild_only")),
                  ),
                ],
              });

              return;
            }

            try {
              const channels = await client.prisma.lockdownChannel.findMany({
                where: { guildId: message.guild.id },
                orderBy: { createdAt: "desc" },
              });

              const container = new Container();

              if (channels.length === 0) {
                container.text(
                  Text(icons.locked + " " + client.i18n.t("commands.lockdown.channel.list.none")),
                );
              } else {
                const lines: string[] = [];

                for (const entry of channels) {
                  lines.push(`- <#${entry.channelId}>`);
                }

                container.text(
                  Text(icons.locked + " " + client.i18n.t("commands.lockdown.channel.list.title", {
                      count: String(channels.length),
                      noun: channels.length === 1 ? "channel" : "channels",
                      channels: lines.join("\n"),
                    }),
                  ),
                );
              }

              await message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [container],
              });
            } catch {
              await message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                  new Container().text(
                    Text(icons.locked + " " + client.i18n.t(
                        "commands.lockdown.channel.list.fetch_error",
                      ),
                    ),
                  ),
                ],
              });
            }
          },
        }),

        new MessageSubcommand({
          name: "remove",
          description: "Remove a channel from the lockdown channel list.",
          category: "Moderation",
          guildOnly: true,
          userPermissions: ["ManageGuild"],
          arguments: [
            {
              name: "channel",
              aliases: ["c"],
              type: "channel",
              description: "The channel to remove from the lockdown list.",
              required: true,
            },
          ],

          async execute(client, message, args) {
            const channel = args.getChannel("channel");

            if (!channel || !message.guild) {
              await message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                  new Container().text(
                    Text(icons.locked + " " + client.i18n.t(
                        "commands.lockdown.channel.remove.channel_not_found",
                      ),
                    ),
                  ),
                ],
              });

              return;
            }

            try {
              const existing = await client.prisma.lockdownChannel.findUnique({
                where: {
                  guildId_channelId: {
                    guildId: message.guild.id,
                    channelId: channel.id,
                  },
                },
              });

              if (!existing) {
                await message.reply({
                  flags: MessageFlags.IsComponentsV2,
                  components: [
                    new Container().text(
                      Text(icons.locked + " " + client.i18n.t(
                          "commands.lockdown.channel.remove.not_found",
                          {
                            channel: channel.toString(),
                          },
                        ),
                      ),
                    ),
                  ],
                });

                return;
              }

              await client.prisma.lockdownChannel.delete({
                where: {
                  guildId_channelId: {
                    guildId: message.guild.id,
                    channelId: channel.id,
                  },
                },
              });

              await message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                  new Container().text(
                    Text(icons.locked + " " + client.i18n.t(
                        "commands.lockdown.channel.remove.success",
                        {
                          channel: channel.toString(),
                        },
                      ),
                    ),
                  ),
                ],
              });
            } catch {
              await message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                  new Container().text(
                    Text(icons.locked + " " + client.i18n.t("commands.lockdown.channel.remove.failed"),
                    ),
                  ),
                ],
              });
            }
          },
        }),
      ],
    }),

    new MessageSubcommand({
      name: "role",
      description: "Manage lockdown role settings.",
      category: "Moderation",
      guildOnly: true,

      subcommands: [
        new MessageSubcommand({
          name: "add",
          description: "Add a role to the lockdown role list.",
          category: "Moderation",
          guildOnly: true,
          userPermissions: ["ManageGuild"],
          arguments: [
            {
              name: "role",
              aliases: ["r"],
              type: "role",
              description: "The role to add to the lockdown list.",
              required: true,
            },
          ],

          async execute(client, message, args) {
            const role = args.getRole("role");

            if (!role || !message.guild) {
              await message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                  new Container().text(
                    Text(icons.locked + " " + client.i18n.t(
                        "commands.lockdown.role.add.role_not_found",
                      ),
                    ),
                  ),
                ],
              });

              return;
            }

            try {
              await client.prisma.guild.upsert({
                where: { id: message.guild.id },
                update: {},
                create: { id: message.guild.id },
              });

              const existing = await client.prisma.lockdownRole.findUnique({
                where: {
                  guildId_roleId: {
                    guildId: message.guild.id,
                    roleId: role.id,
                  },
                },
              });

              if (existing) {
                await message.reply({
                  flags: MessageFlags.IsComponentsV2,
                  components: [
                    new Container().text(
                      Text(icons.locked + " " + client.i18n.t(
                          "commands.lockdown.role.add.already_added",
                          {
                            role: role.toString(),
                          },
                        ),
                      ),
                    ),
                  ],
                });

                return;
              }

              await client.prisma.lockdownRole.create({
                data: {
                  guildId: message.guild.id,
                  roleId: role.id,
                },
              });

              await message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                  new Container().text(
                    Text(icons.locked + " " + client.i18n.t("commands.lockdown.role.add.success", {
                        role: role.toString(),
                      }),
                    ),
                  ),
                ],
              });
            } catch {
              await message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                  new Container().text(
                    Text(icons.locked + " " + client.i18n.t("commands.lockdown.role.add.failed")),
                  ),
                ],
              });
            }
          },
        }),

        new MessageSubcommand({
          name: "list",
          description: "List all roles in the lockdown role list.",
          category: "Moderation",
          guildOnly: true,
          userPermissions: ["ManageGuild"],

          async execute(client, message) {
            if (!message.guild) {
              await message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                  new Container().text(
                    Text(icons.locked + " " + client.i18n.t("commands.lockdown.guild_only")),
                  ),
                ],
              });

              return;
            }

            try {
              const roles = await client.prisma.lockdownRole.findMany({
                where: { guildId: message.guild.id },
                orderBy: { createdAt: "desc" },
              });

              const container = new Container();

              if (roles.length === 0) {
                container.text(
                  Text(icons.locked + " " + client.i18n.t("commands.lockdown.role.list.none")),
                );
              } else {
                const lines: string[] = [];

                for (const entry of roles) {
                  lines.push(`- <@&${entry.roleId}>`);
                }

                container.text(
                  Text(icons.locked + " " + client.i18n.t("commands.lockdown.role.list.title", {
                      count: String(roles.length),
                      noun: roles.length === 1 ? "role" : "roles",
                      roles: lines.join("\n"),
                    }),
                  ),
                );
              }

              await message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [container],
              });
            } catch {
              await message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                  new Container().text(
                    Text(icons.locked + " " + client.i18n.t("commands.lockdown.role.list.fetch_error"),
                    ),
                  ),
                ],
              });
            }
          },
        }),

        new MessageSubcommand({
          name: "remove",
          description: "Remove a role from the lockdown role list.",
          category: "Moderation",
          guildOnly: true,
          userPermissions: ["ManageGuild"],
          arguments: [
            {
              name: "role",
              aliases: ["r"],
              type: "role",
              description: "The role to remove from the lockdown list.",
              required: true,
            },
          ],

          async execute(client, message, args) {
            const role = args.getRole("role");

            if (!role || !message.guild) {
              await message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                  new Container().text(
                    Text(icons.locked + " " + client.i18n.t(
                        "commands.lockdown.role.remove.role_not_found",
                      ),
                    ),
                  ),
                ],
              });

              return;
            }

            try {
              const existing = await client.prisma.lockdownRole.findUnique({
                where: {
                  guildId_roleId: {
                    guildId: message.guild.id,
                    roleId: role.id,
                  },
                },
              });

              if (!existing) {
                await message.reply({
                  flags: MessageFlags.IsComponentsV2,
                  components: [
                    new Container().text(
                      Text(icons.locked + " " + client.i18n.t(
                          "commands.lockdown.role.remove.not_found",
                          {
                            role: role.toString(),
                          },
                        ),
                      ),
                    ),
                  ],
                });

                return;
              }

              await client.prisma.lockdownRole.delete({
                where: {
                  guildId_roleId: {
                    guildId: message.guild.id,
                    roleId: role.id,
                  },
                },
              });

              await message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                  new Container().text(
                    Text(icons.locked + " " + client.i18n.t("commands.lockdown.role.remove.success", {
                        role: role.toString(),
                      }),
                    ),
                  ),
                ],
              });
            } catch {
              await message.reply({
                flags: MessageFlags.IsComponentsV2,
                components: [
                  new Container().text(
                    Text(icons.locked + " " + client.i18n.t("commands.lockdown.role.remove.failed")),
                  ),
                ],
              });
            }
          },
        }),
      ],
    }),
  ],
});
