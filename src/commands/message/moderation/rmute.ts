import { MessageFlags } from "discord.js";
import { MessageCommand, MessageSubcommand } from "@/classes/Command";
import { Container, Text } from "@/ui/components";
import { icons } from "@/utils/icons";
import { extractDuration, msToHuman } from "@/utils/duration";
import {
  ensureReactionMuteRole,
  scheduleTemporaryMute,
  clearTemporaryMuteTimer,
} from "@/utils/mute";
import { createModerationCase } from "@/utils/moderationCase";
import { deliverPunishmentDm, sendPunishmentResponse } from "@/utils/invoke";
import prisma from "@/libs/prisma";

export default new MessageCommand({
  name: "rmute",
  description: "Mute a user from adding reactions.",
  aliases: ["reactionmute"],
  category: "Moderation",
  guildOnly: true,
  userPermissions: ["ModerateMembers"],
  botPermissions: ["ManageRoles"],

  subcommands: [
    new MessageSubcommand({
      name: "setup",
      description: "Setup or configure the reaction mute role.",
      userPermissions: ["Administrator"],
      botPermissions: ["ManageRoles", "ManageChannels"],
      arguments: [
        {
          name: "role",
          aliases: ["r"],
          type: "role",
          description: "Role to use for reaction mute (optional).",
          required: false,
        },
      ],
      async execute(client, message, args) {
        if (!message.guild) return;

        const role = args.getRole("role");
        const muteRole = await ensureReactionMuteRole(
          message.guild,
          message.author,
          role,
        );

        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
          new Container().text(
            Text(
              `${icons.Correct} ${client.i18n.t("commands.rmute.setup_success", {
                role: muteRole.id,
              })}`,
            ),
          ),
          ],
        });
      },
    }),

    new MessageSubcommand({
      name: "role",
      description: "Set an existing role as the reaction mute role.",
      userPermissions: ["Administrator"],
      arguments: [
        {
          name: "role",
          aliases: ["r"],
          type: "role",
          description: "Role to set as reaction mute role.",
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
            Text(`${icons.warning} ${client.i18n.t("commands.rmute.invalid_role")}`),
          ),
            ],
          });
          return;
        }

        await ensureReactionMuteRole(message.guild, message.author, role);

        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
          new Container().text(
            Text(
              `${icons.Correct} ${client.i18n.t("commands.rmute.role_success", {
                role: role.id,
              })}`,
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
      description: "The user to reaction mute.",
      required: true,
    },
    {
      name: "reason",
      aliases: ["r"],
      type: "string",
      description:
        "Optional duration (e.g. 1h, 1d) followed by a reason. E.g. `1h spamming reactions`.",
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
              icons.addreactions +
                " " +
                client.i18n.t("commands.rmute.user_not_found"),
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
              icons.addreactions + " " + client.i18n.t("commands.rmute.self"),
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
              icons.addreactions + " " + client.i18n.t("commands.rmute.bot"),
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
              icons.addreactions +
                " " +
                client.i18n.t("commands.rmute.not_in_guild"),
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
              icons.addreactions +
                " " +
                client.i18n.t("commands.rmute.role_hierarchy"),
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
              icons.addreactions +
                " " +
                client.i18n.t("commands.rmute.bot_hierarchy"),
            ),
          ),
        ],
      });
      return;
    }

    const role = await ensureReactionMuteRole(message.guild, message.author);
    if (member.roles.cache.has(role.id)) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.addreactions +
                " " +
                client.i18n.t("commands.rmute.already_muted"),
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

    try {
      await member.roles.add(role, `${message.author.tag}: ${reason}`);
    } catch {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.addreactions + " " + client.i18n.t("commands.rmute.failed"),
            ),
          ),
        ],
      });
      return;
    }

    if (durationMs !== null) {
      const expiresAt = new Date(Date.now() + durationMs);
      await prisma.temporaryMute.upsert({
        where: {
          guildId_userId_type: {
            guildId: message.guild.id,
            userId: target.id,
            type: "reaction",
          },
        },
        create: {
          guildId: message.guild.id,
          userId: target.id,
          type: "reaction",
          roleId: role.id,
          reason,
          expiresAt,
        },
        update: {
          roleId: role.id,
          reason,
          expiresAt,
        },
      });

      scheduleTemporaryMute(client, {
        guildId: message.guild.id,
        userId: target.id,
        type: "reaction",
        expiresAt,
        roleId: role.id,
      });
    } else {
      clearTemporaryMuteTimer(message.guild.id, target.id, "reaction");
    }

    const caseNumber = await createModerationCase({
      guildId: message.guild.id,
      type: "rmute",
      userId: target.id,
      moderatorId: message.author.id,
      reason,
      duration: durationMs,
      expiresAt: durationMs !== null ? new Date(Date.now() + durationMs) : null,
    });

    const durationStr = durationMs !== null ? msToHuman(durationMs) : null;

    await deliverPunishmentDm({
      guild: message.guild,
      target,
      action: "rmute",
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
                  ? client.i18n.t("commands.rmute.dm_temp", {
                      guild: message.guild!.name,
                      duration: durationStr,
                      reason,
                    })
                  : client.i18n.t("commands.rmute.dm", {
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
      action: "rmute",
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
                  ? client.i18n.t("commands.rmute.success_temp", {
                      user: target.tag,
                      duration: durationStr,
                      reason,
                    })
                  : client.i18n.t("commands.rmute.success", {
                      user: target.tag,
                      reason,
                    }),
              ),
            ),
          ],
        });
      },
    });
  },
});
