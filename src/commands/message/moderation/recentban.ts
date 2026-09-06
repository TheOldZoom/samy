import { MessageFlags } from "discord.js";
import { MessageCommand } from "@/classes/Command";
import { Container, Text } from "@/ui/components";
import { icons } from "@/utils/icons";
import { parseDuration, msToHuman } from "@/utils/duration";
import { createModerationCase } from "@/utils/moderationCase";

const MAX_RECENTBAN_AGE_MS = 3 * 24 * 60 * 60 * 1000;

export default new MessageCommand({
  name: "recentban",
  description:
    "Chunk-ban members who joined recently (ideal for raid cleanup).",
  aliases: ["chunkban", "raidban"],
  category: "Moderation",
  guildOnly: true,
  userPermissions: ["BanMembers"],
  botPermissions: ["BanMembers"],

  arguments: [
    {
      name: "threshold",
      aliases: ["time", "count", "t"],
      type: "string",
      description: "Timeframe (e.g. 10m, 1h) or member count (e.g. 25).",
      required: true,
    },
    {
      name: "reason",
      aliases: ["r"],
      type: "string",
      description: "Reason for chunk-banning.",
      required: false,
      default: "Raid cleanup / recentban",
    },
  ],

  async execute(client, message, args) {
    if (!message.guild) return;

    const thresholdInput = args.getString("threshold")?.trim();
    if (!thresholdInput) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              `${icons.warning} ${client.i18n.t("commands.recentban.missing_threshold")}`,
            ),
          ),
        ],
      });
      return;
    }

    const durationMs = parseDuration(thresholdInput);
    const countNumber = parseInt(thresholdInput, 10);
    const isCount =
      !durationMs && !Number.isNaN(countNumber) && countNumber > 0;

    if (durationMs && durationMs > MAX_RECENTBAN_AGE_MS) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              `${icons.warning} ${client.i18n.t(
                "commands.recentban.invalid_duration",
                {
                  max: msToHuman(MAX_RECENTBAN_AGE_MS),
                },
              )}`,
            ),
          ),
        ],
      });
      return;
    }

    if (!durationMs && !isCount) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              `${icons.warning} ${client.i18n.t(
                "commands.recentban.invalid_threshold",
                {
                  threshold: thresholdInput,
                },
              )}`,
            ),
          ),
        ],
      });
      return;
    }

    const reason = args.getString("reason") ?? "Raid cleanup / recentban";
    const authorMember = message.member;
    const botMember = message.guild.members.me;

    if (!authorMember || !botMember) return;

    const allMembers = await message.guild.members.fetch();

    const now = Date.now();
    let candidates = [...allMembers.values()].filter((m) => {
      if (m.id === message.author.id) return false;
      if (m.id === client.user?.id) return false;
      if (m.id === message.guild!.ownerId) return false;

      if (
        message.guild!.ownerId !== message.author.id &&
        authorMember.roles.highest.position <= m.roles.highest.position
      ) {
        return false;
      }
      if (botMember.roles.highest.position <= m.roles.highest.position) {
        return false;
      }

      if (
        m.permissions.has("Administrator") ||
        m.permissions.has("ManageGuild")
      ) {
        return false;
      }

      return true;
    });

    if (durationMs) {
      const cutoff = now - durationMs;
      candidates = candidates.filter(
        (m) => m.joinedTimestamp !== null && m.joinedTimestamp >= cutoff,
      );
    } else if (isCount) {
      candidates.sort(
        (a, b) => (b.joinedTimestamp ?? 0) - (a.joinedTimestamp ?? 0),
      );
      candidates = candidates.slice(0, countNumber);
    }

    if (candidates.length === 0) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              `${icons.info} ${client.i18n.t(
                "commands.recentban.no_candidates",
                {
                  threshold: thresholdInput,
                },
              )}`,
            ),
          ),
        ],
      });
      return;
    }

    const statusMsg = await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(
            `${icons.loading} ${client.i18n.t("commands.recentban.banning", {
              count: candidates.length,
            })}`,
          ),
        ),
      ],
    });

    let successCount = 0;
    let failCount = 0;
    const BATCH_SIZE = 5;

    for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
      const batch = candidates.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (member) => {
          try {
            await message.guild!.members.ban(member.id, {
              deleteMessageSeconds: 24 * 60 * 60,
              reason: `${message.author.tag} (recentban ${thresholdInput}): ${reason}`,
            });
            successCount++;
          } catch {
            failCount++;
          }
        }),
      );

      if (i + BATCH_SIZE < candidates.length) {
        await Bun.sleep(400);
      }
    }

    await createModerationCase({
      guildId: message.guild.id,
      type: "recentban",
      userId: message.author.id,
      moderatorId: message.author.id,
      reason: `Chunk-banned ${successCount} members (${thresholdInput}): ${reason}`,
    });

    const description = durationMs
      ? client.i18n.t("commands.recentban.complete_description_time", {
          duration: msToHuman(durationMs),
        })
      : client.i18n.t("commands.recentban.complete_description_count", {
          count: candidates.length,
        });

    const failedLine =
      failCount > 0
        ? client.i18n.t("commands.recentban.complete_failed", {
            failed: failCount,
          })
        : "";

    const summaryText = `${icons.ban} ${client.i18n.t(
      "commands.recentban.complete",
      {
        success: successCount,
        description,
        failed: failedLine,
        reason,
      },
    )}`;

    if (statusMsg.editable) {
      await statusMsg.edit({
        flags: MessageFlags.IsComponentsV2,
        components: [new Container().text(Text(summaryText))],
      });
    } else {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [new Container().text(Text(summaryText))],
      });
    }
  },
});
