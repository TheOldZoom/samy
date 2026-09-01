import { MessageFlags } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand, MessageSubcommand } from "@/classes/Command";
import { Container, Text } from "@/ui/components";

export default new MessageCommand({
  name: "autorole",
  description: "Configure roles to assign automatically when members join.",
  aliases: ["ar", "autoroles"],
  guildOnly: true,
  userPermissions: ["ManageGuild"],
  category: "Server",

  subcommands: [
    new MessageSubcommand({
      name: "add",
      description: "Add a role to the autorole list.",
      userPermissions: ["ManageGuild"],

      arguments: [
        {
          name: "role",
          aliases: ["r"],
          description: "The role to assign on join.",
          type: "role",
          required: true,
        },
      ],

      async execute(client, message, args) {
        const role = args.getRole("role");

        if (!role || !message.guildId || !message.guild) return;

        if (role.managed) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(
                  icons.addreactions +
                    " " +
                    client.i18n.t("commands.autorole.managed"),
                ),
              ),
            ],
          });
          return;
        }

        const member =
          message.guild.members.cache.get(message.author.id) ??
          (await message.guild.members
            .fetch(message.author.id)
            .catch(() => null));

        if (member && role.position >= member.roles.highest.position) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(
                  icons.addreactions +
                    " " +
                    client.i18n.t("commands.autorole.user_hierarchy"),
                ),
              ),
            ],
          });
          return;
        }

        const botMember = message.guild.members.me;
        if (botMember && role.position >= botMember.roles.highest.position) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(
                  icons.addreactions +
                    " " +
                    client.i18n.t("commands.autorole.hierarchy"),
                ),
              ),
            ],
          });
          return;
        }

        const existing = await client.prisma.autorole.findUnique({
          where: {
            guildId_roleId: {
              guildId: message.guildId,
              roleId: role.id,
            },
          },
        });

        if (existing) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(
                  icons.addreactions +
                    " " +
                    client.i18n.t("commands.autorole.already_exists", {
                      role: role.toString(),
                    }),
                ),
              ),
            ],
          });
          return;
        }

        await client.prisma.guild.upsert({
          where: { id: message.guildId },
          update: {},
          create: { id: message.guildId },
        });

        await client.prisma.autorole.create({
          data: {
            guildId: message.guildId,
            roleId: role.id,
          },
        });

        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(
                icons.addreactions +
                  " " +
                  client.i18n.t("commands.autorole.added", {
                    role: role.toString(),
                  }),
              ),
            ),
          ],
        });
      },
    }),

    new MessageSubcommand({
      name: "remove",
      description: "Remove a role from the autorole list.",
      userPermissions: ["ManageGuild"],

      arguments: [
        {
          name: "role",
          aliases: ["r"],
          description: "The role to remove from the autorole list.",
          type: "role",
          required: true,
        },
      ],

      async execute(client, message, args) {
        const role = args.getRole("role");

        if (!role || !message.guildId) return;

        const existing = await client.prisma.autorole.findUnique({
          where: {
            guildId_roleId: {
              guildId: message.guildId,
              roleId: role.id,
            },
          },
        });

        if (!existing) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(
                  icons.addreactions +
                    " " +
                    client.i18n.t("commands.autorole.not_found", {
                      role: role.toString(),
                    }),
                ),
              ),
            ],
          });
          return;
        }

        await client.prisma.autorole.delete({
          where: {
            guildId_roleId: {
              guildId: message.guildId,
              roleId: role.id,
            },
          },
        });

        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(
                icons.addreactions +
                  " " +
                  client.i18n.t("commands.autorole.removed", {
                    role: role.toString(),
                  }),
              ),
            ),
          ],
        });
      },
    }),

    new MessageSubcommand({
      name: "list",
      description: "List all configured autoroles.",
      userPermissions: ["ManageGuild"],

      async execute(client, message) {
        if (!message.guildId) return;

        const autoroles = await client.prisma.autorole.findMany({
          where: { guildId: message.guildId },
          orderBy: { createdAt: "asc" },
        });

        if (autoroles.length === 0) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(
                  icons.addreactions +
                    " " +
                    client.i18n.t("commands.autorole.none"),
                ),
              ),
            ],
          });
          return;
        }

        const roles = autoroles.map((ar) => `- <@&${ar.roleId}>`).join("\n");

        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(
                icons.addreactions +
                  " " +
                  client.i18n.t("commands.autorole.list", {
                    count: autoroles.length,
                    roles,
                  }),
              ),
            ),
          ],
        });
      },
    }),

    new MessageSubcommand({
      name: "clear",
      description: "Remove all autoroles.",
      userPermissions: ["ManageGuild"],

      async execute(client, message) {
        if (!message.guildId) return;

        const result = await client.prisma.autorole.deleteMany({
          where: { guildId: message.guildId },
        });

        if (result.count === 0) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(
                  icons.addreactions +
                    " " +
                    client.i18n.t("commands.autorole.none"),
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
              Text(
                icons.addreactions +
                  " " +
                  client.i18n.t("commands.autorole.cleared", {
                    count: result.count,
                  }),
              ),
            ),
          ],
        });
      },
    }),
  ],
});
