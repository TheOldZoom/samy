import { MessageFlags } from "discord.js";

import { icons } from "@/utils/icons";
import { MessageCommand, MessageSubcommand } from "@/classes/Command";
import { Container, Text } from "@/ui/components";
import {
  addFakePermission,
  getFakePermissions,
  removeFakePermission,
} from "@/utils/settings";

const VALID_PERMISSIONS = new Set([
  "CreateInstantInvite",
  "KickMembers",
  "BanMembers",
  "Administrator",
  "ManageChannels",
  "ManageGuild",
  "AddReactions",
  "ViewAuditLog",
  "PrioritySpeaker",
  "Stream",
  "ViewChannel",
  "SendMessages",
  "SendTTSMessages",
  "ManageMessages",
  "EmbedLinks",
  "AttachFiles",
  "ReadMessageHistory",
  "MentionEveryone",
  "UseExternalEmojis",
  "ViewGuildInsights",
  "Connect",
  "Speak",
  "MuteMembers",
  "DeafenMembers",
  "MoveMembers",
  "UseVAD",
  "ChangeNickname",
  "ManageNicknames",
  "ManageRoles",
  "ManageWebhooks",
  "ManageEmojisAndStickers",
  "ManageGuildExpressions",
  "UseApplicationCommands",
  "RequestToSpeak",
  "ManageEvents",
  "ManageThreads",
  "CreatePublicThreads",
  "CreatePrivateThreads",
  "UseExternalStickers",
  "SendMessagesInThreads",
  "UseEmbeddedActivities",
  "ModerateMembers",
  "ViewCreatorMonetizationAnalytics",
  "UseSoundboard",
  "CreateGuildExpressions",
  "CreateEvents",
  "UseExternalSounds",
  "SendVoiceMessages",
  "SetVoiceChannelStatus",
  "SendPolls",
  "UseExternalApps",
  "PinMessages",
  "BypassSlowmode",
]);

function canManageRole(
  member: {
    id: string;
    permissions: { has: (perm: string) => boolean };
    roles: { highest: { position: number } };
  },
  role: { id: string; position: number },
): boolean {
  if (member.id === role.id) return false;
  if (member.permissions.has("Administrator")) return true;
  if (!member.permissions.has("ManageRoles")) return false;
  return member.roles.highest.position > role.position;
}

function canManageFakePermission(
  member: {
    permissions: {
      has: (perm: string) => boolean;
      flags: Record<string, unknown>;
    };
  },
  permission: string,
): boolean {
  if (member.permissions.has("Administrator")) return true;
  if (member.permissions.has("ManageGuild")) return true;

  const permKey = permission;
  return member.permissions.has(permKey);
}

export default new MessageCommand({
  name: "fakepermissions",
  description: "Manage fake permissions for roles.",
  category: "Settings",
  guildOnly: true,
  userPermissions: ["ManageGuild"],
  botPermissions: ["SendMessages", "EmbedLinks"],
  aliases: ["fp"],

  subcommands: [
    new MessageSubcommand({
      name: "add",
      description: "Add a fake permission to a role.",
      userPermissions: ["ManageGuild"],
      botPermissions: ["SendMessages", "EmbedLinks"],
      arguments: [
        {
          name: "role",
          type: "role",
          description: "The role to add the permission to.",
          required: true,
        },
        {
          name: "permission",
          type: "string",
          description: "The permission to add.",
          required: true,
        },
      ],

      async execute(client, message, args) {
        const role = args.getRole("role");
        const permission = args.getString("permission");

        if (!role || !permission) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(
                  icons.Guardian +
                    " " +
                    client.i18n.t("commands.fakepermissions.usage_add"),
                ),
              ),
            ],
          });

          return;
        }

        if (!VALID_PERMISSIONS.has(permission)) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(
                  `Invalid permission: \`${permission}\`. Use a valid Discord permission name like \`BanMembers\` or \`KickMembers\`.`,
                ),
              ),
            ],
          });

          return;
        }

        const member = message.member;

        if (!member) return;

        if (!canManageFakePermission(member, permission)) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(
                  `You need the \`${permission}\` permission to add it as a fake permission.`,
                ),
              ),
            ],
          });

          return;
        }

        const botMember = message.guild!.members.me;

        if (!botMember) return;

        if (!canManageRole(member, role)) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(
                  `You can't manage that role. Make sure your highest role is above the target role.`,
                ),
              ),
            ],
          });

          return;
        }

        try {
          await addFakePermission(
            message.guild!.id,
            role.id,
            permission,
            client,
          );

          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(
                  icons.Guardian +
                    " " +
                    client.i18n.t("commands.fakepermissions.added", {
                      permission,
                      role: role.name,
                    }),
                ),
              ),
            ],
          });
        } catch {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(Text("Failed to add fake permission.")),
            ],
          });
        }
      },
    }),

    new MessageSubcommand({
      name: "remove",
      description: "Remove a fake permission from a role.",
      userPermissions: ["ManageGuild"],
      botPermissions: ["SendMessages", "EmbedLinks"],

      arguments: [
        {
          name: "role",
          type: "role",
          description: "The role to remove the permission from.",
          required: true,
        },
        {
          name: "permission",
          type: "string",
          description: "The permission to remove.",
          required: true,
        },
      ],

      async execute(client, message, args) {
        const role = args.getRole("role");
        const permission = args.getString("permission");

        if (!role || !permission) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(
                  icons.Guardian +
                    " " +
                    client.i18n.t("commands.fakepermissions.usage_remove"),
                ),
              ),
            ],
          });

          return;
        }

        if (!VALID_PERMISSIONS.has(permission)) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(`Invalid permission: \`${permission}\`.`),
              ),
            ],
          });

          return;
        }

        const member = message.member;

        if (!member) return;

        const botMember = message.guild!.members.me;

        if (!botMember) return;

        if (!canManageRole(botMember, role)) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(
                  `I can't manage that role. Make sure my highest role is above the target role.`,
                ),
              ),
            ],
          });

          return;
        }

        if (!canManageRole(member, role)) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(
                  `You can't manage that role. Make sure your highest role is above the target role.`,
                ),
              ),
            ],
          });

          return;
        }

        const removed = await removeFakePermission(
          message.guild!.id,
          role.id,
          permission,
          client,
        );

        if (!removed) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(Text("Fake permission not found.")),
            ],
          });

          return;
        }

        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(
                icons.Guardian +
                  " " +
                  client.i18n.t("commands.fakepermissions.removed", {
                    permission,
                    role: role.name,
                  }),
              ),
            ),
          ],
        });
      },
    }),

    new MessageSubcommand({
      name: "list",
      description: "List fake permissions for a role.",
      userPermissions: ["ManageGuild"],
      botPermissions: ["SendMessages", "EmbedLinks"],

      arguments: [
        {
          name: "role",
          type: "role",
          description: "The role to list permissions for.",
          required: false,
        },
      ],

      async execute(client, message, args) {
        const role = args.getRole("role");

        if (role) {
          const permissions = await getFakePermissions(
            message.guild!.id,
            role.id,
            client,
          );

          if (permissions.length === 0) {
            await message.reply({
              flags: MessageFlags.IsComponentsV2,
              components: [
                new Container().text(
                  Text(
                    icons.Guardian +
                      " " +
                      client.i18n.t("commands.fakepermissions.none", {
                        role: `**${role.name}**`,
                      }),
                  ),
                ),
              ],
            });

            return;
          }

          const lines = permissions
            .map((p) => `\`${p.permission}\``)
            .join("\n");

          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(
                  icons.Guardian +
                    " " +
                    client.i18n.t("commands.fakepermissions.list_title", {
                      target: `**${role.name}**`,
                      permissions: lines,
                    }),
                ),
              ),
            ],
          });

          return;
        }

        const allPermissions = await client.prisma.fakePermission.findMany({
          where: { guildId: message.guild!.id },
          orderBy: [{ roleId: "asc" }, { permission: "asc" }],
        });

        if (allPermissions.length === 0) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(
                  icons.Guardian +
                    " " +
                    client.i18n.t("commands.fakepermissions.none"),
                ),
              ),
            ],
          });

          return;
        }

        const grouped = new Map<string, string[]>();

        for (const p of allPermissions) {
          const list = grouped.get(p.roleId) ?? [];
          list.push(p.permission);
          grouped.set(p.roleId, list);
        }

        const lines: string[] = [];

        for (const [roleId, permissions] of grouped) {
          const role = message.guild!.roles.cache.get(roleId);
          const roleName = role ? `**${role.name}**` : `\`${roleId}\``;
          const perms = permissions.map((p) => `\`${p}\``).join(", ");
          lines.push(`${roleName}: ${perms}`);
        }

        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(
                `${client.i18n.t("commands.fakepermissions.list_all")}\n\n${lines.join("\n")}`,
              ),
            ),
          ],
        });
      },
    }),
  ],
});
