import { MessageFlags } from "discord.js";
import { MessageCommand, MessageSubcommand } from "@/classes/Command";
import { Container, Text } from "@/ui/components";
import { icons } from "@/utils/icons";
import { extractDuration, msToHuman } from "@/utils/duration";
import {
  ensureImageMuteRole,
  scheduleTemporaryMute,
  clearTemporaryMuteTimer,
} from "@/utils/mute";
import { createModerationCase } from "@/utils/moderationCase";
import { deliverPunishmentDm, sendPunishmentResponse } from "@/utils/invoke";
import prisma from "@/libs/prisma";

export default new MessageCommand({
  name: "imute",
  description: "Mute a user from sending images and attachments.",
  aliases: ["imagemute"],
  category: "Moderation",
  guildOnly: true,
  userPermissions: ["ModerateMembers"],
  botPermissions: ["ManageRoles"],

  subcommands: [
    new MessageSubcommand({
      name: "setup",
      description: "Setup or configure the image mute role.",
      userPermissions: ["Administrator"],
      botPermissions: ["ManageRoles", "ManageChannels"],
      arguments: [
        {
          name: "role",
          aliases: ["r"],
          type: "role",
          description: "Role to use for image mute (optional).",
          required: false,
        },
      ],
      async execute(client, message, args) {
        if (!message.guild) return;

        const role = args.getRole("role");
        const muteRole = await ensureImageMuteRole(
          message.guild,
          message.author,
          role,
        );

        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(
                `${icons.Correct} ${client.i18n.t(
                  "commands.imute.setup_success",
                  {
                    role: muteRole.id,
                  },
                )}`,
              ),
            ),
          ],
        });
      },
    }),

    new MessageSubcommand({
      name: "role",
      description: "Set an existing role as the image mute role.",
      userPermissions: ["Administrator"],
      arguments: [
        {
          name: "role",
          aliases: ["r"],
          type: "role",
          description: "Role to set as image mute role.",
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
                  `${icons.warning} ${client.i18n.t("commands.imute.invalid_role")}`,
                ),
              ),
            ],
          });
          return;
        }

        await ensureImageMuteRole(message.guild, message.author, role);

        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(
                `${icons.Correct} ${client.i18n.t(
                  "commands.imute.role_success",
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
  ],

  arguments: [
    {
      name: "user",
      aliases: ["u", "member", "target"],
      type: "user",
      description: "The user to image mute.",
      required: true,
    },
    {
      name: "reason",
      aliases: ["r"],
      type: "string",
      description:
        "Optional duration (e.g. 1h, 1d) followed by a reason. E.g. `1h spamming images`.",
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
              icons.servermute +
                " " +
                client.i18n.t("commands.imute.user_not_found"),
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
            Text(icons.servermute + " " + client.i18n.t("commands.imute.self")),
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
            Text(icons.servermute + " " + client.i18n.t("commands.imute.bot")),
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
              icons.servermute +
                " " +
                client.i18n.t("commands.imute.not_in_guild"),
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
              icons.servermute +
                " " +
                client.i18n.t("commands.imute.role_hierarchy"),
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
              icons.servermute +
                " " +
                client.i18n.t("commands.imute.bot_hierarchy"),
            ),
          ),
        ],
      });
      return;
    }

    const role = await ensureImageMuteRole(message.guild, message.author);
    if (member.roles.cache.has(role.id)) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.servermute +
                " " +
                client.i18n.t("commands.imute.already_muted"),
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
              icons.servermute + " " + client.i18n.t("commands.imute.failed"),
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
            type: "image",
          },
        },
        create: {
          guildId: message.guild.id,
          userId: target.id,
          type: "image",
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
        type: "image",
        expiresAt,
        roleId: role.id,
      });
    } else {
      clearTemporaryMuteTimer(message.guild.id, target.id, "image");
    }

    const caseNumber = await createModerationCase({
      guildId: message.guild.id,
      type: "imute",
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
      action: "imute",
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
                  ? client.i18n.t("commands.imute.dm_temp", {
                      guild: message.guild!.name,
                      duration: durationStr,
                      reason,
                    })
                  : client.i18n.t("commands.imute.dm", {
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
      action: "imute",
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
                  ? client.i18n.t("commands.imute.success_temp", {
                      user: target.tag,
                      duration: durationStr,
                      reason,
                    })
                  : client.i18n.t("commands.imute.success", {
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
