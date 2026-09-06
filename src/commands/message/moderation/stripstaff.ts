import { MessageFlags } from "discord.js";
import { MessageCommand, MessageSubcommand } from "@/classes/Command";
import { Container, Text } from "@/ui/components";
import { icons } from "@/utils/icons";
import {
  addStaffRole,
  getMemberStaffRoles,
  getStaffRoles,
  removeStaffRole,
} from "@/utils/staff";
import { createModerationCase } from "@/utils/moderationCase";
import { deliverPunishmentDm, sendPunishmentResponse } from "@/utils/invoke";

export default new MessageCommand({
  name: "stripstaff",
  description: "Strip all staff and moderation roles from a member.",
  aliases: ["demote", "removestaff"],
  category: "Moderation",
  guildOnly: true,
  userPermissions: ["Administrator"],
  botPermissions: ["ManageRoles"],

  subcommands: [
    new MessageSubcommand({
      name: "add",
      aliases: ["bind"],
      description: "Bind a role to be treated as a staff role.",
      userPermissions: ["Administrator"],
      arguments: [
        {
          name: "role",
          aliases: ["r"],
          type: "role",
          description: "The role to bind as staff.",
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
                  `${icons.warning} ${client.i18n.t("commands.stripstaff.invalid_role")}`,
                ),
              ),
            ],
          });
          return;
        }

        await addStaffRole(message.guild.id, role.id);
        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(
                `${icons.Correct} ${client.i18n.t(
                  "commands.stripstaff.add_success",
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
      name: "remove",
      aliases: ["unbind"],
      description: "Remove a role from configured staff roles.",
      userPermissions: ["Administrator"],
      arguments: [
        {
          name: "role",
          aliases: ["r"],
          type: "role",
          description: "The role to remove from staff roles.",
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
                  `${icons.warning} ${client.i18n.t("commands.stripstaff.invalid_role")}`,
                ),
              ),
            ],
          });
          return;
        }

        const removed = await removeStaffRole(message.guild.id, role.id);
        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(
                removed
                  ? `${icons.Correct} ${client.i18n.t("commands.stripstaff.remove_success", { role: role.id })}`
                  : `${icons.info} ${client.i18n.t("commands.stripstaff.remove_not_found", { role: role.id })}`,
              ),
            ),
          ],
        });
      },
    }),

    new MessageSubcommand({
      name: "list",
      description: "List all explicitly bound staff roles.",
      userPermissions: ["Administrator"],
      async execute(client, message) {
        if (!message.guild) return;

        const roles = await getStaffRoles(message.guild.id);
        if (roles.length === 0) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(
                  `${icons.info} ${client.i18n.t("commands.stripstaff.list_empty")}`,
                ),
              ),
            ],
          });
          return;
        }

        const lines = roles.map((r) => `• <@&${r.roleId}>`);
        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(
                client.i18n.t("commands.stripstaff.list_title", {
                  count: roles.length,
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
      description: "The member to strip staff roles from.",
      required: true,
    },
    {
      name: "reason",
      aliases: ["r"],
      type: "string",
      description: "Reason for stripping staff roles.",
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
              icons.colorstaff +
                " " +
                client.i18n.t("commands.stripstaff.user_not_found"),
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
            Text(
              icons.colorstaff +
                " " +
                client.i18n.t("commands.stripstaff.self"),
            ),
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
            Text(
              icons.colorstaff + " " + client.i18n.t("commands.stripstaff.bot"),
            ),
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
              icons.colorstaff +
                " " +
                client.i18n.t("commands.stripstaff.not_in_guild"),
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
              icons.colorstaff +
                " " +
                client.i18n.t("commands.stripstaff.role_hierarchy"),
            ),
          ),
        ],
      });
      return;
    }

    const botMember = message.guild.members.me;
    if (!botMember) return;

    const staffRoles = await getMemberStaffRoles(member);
    const removableRoles = staffRoles.filter(
      (r) => r.position < botMember.roles.highest.position,
    );

    if (removableRoles.length === 0) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              staffRoles.length > 0
                ? `${icons.colorstaff} ${client.i18n.t(
                    "commands.stripstaff.above_bot",
                    {
                      count: staffRoles.length,
                      target: target.tag,
                    },
                  )}`
                : `${icons.colorstaff} ${client.i18n.t(
                    "commands.stripstaff.no_staff_roles",
                    {
                      target: target.tag,
                    },
                  )}`,
            ),
          ),
        ],
      });
      return;
    }

    const reason = args.getString("reason") ?? "No reason provided.";

    try {
      await member.roles.remove(
        removableRoles,
        `${message.author.tag} (stripstaff): ${reason}`,
      );
    } catch {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.colorstaff +
                " " +
                client.i18n.t("commands.stripstaff.failed"),
            ),
          ),
        ],
      });
      return;
    }

    const caseNumber = await createModerationCase({
      guildId: message.guild.id,
      type: "stripstaff",
      userId: target.id,
      moderatorId: message.author.id,
      reason,
    });

    const roleMentions = removableRoles.map((r) => `<@&${r.id}>`).join(", ");

    await deliverPunishmentDm({
      guild: message.guild,
      target,
      action: "stripstaff",
      moderator: message.author,
      reason,
      caseNumber,
      fallback: async () => {
        await target.send({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(
                client.i18n.t("commands.stripstaff.dm", {
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
      action: "stripstaff",
      moderator: message.author,
      reason,
      caseNumber,
      fallback: async () => {
        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(
                `${icons.colorstaff} ${client.i18n.t(
                  "commands.stripstaff.success",
                  {
                    count: removableRoles.length,
                    target: target.tag,
                    roles: roleMentions,
                    reason,
                  },
                )}`,
              ),
            ),
          ],
        });
      },
    });
  },
});
