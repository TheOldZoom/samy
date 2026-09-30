import {
  PermissionFlagsBits,
  type Guild,
  type GuildMember,
  type User,
} from "discord.js";
import prisma from "@/libs/Prisma";
import { icons } from "@/utils/icons";
import { Container, Text, v2 } from "@/utils/ui/components";

export const DEFAULT_REASON = "No reason provided.";

export function response(content: string, ephemeral = false) {
  return {
    ...v2(
      new Container().text(
        Text(`-# ${icons.hammer} · Moderation`),
        Text(content),
      ),
    ),
    ephemeral,
    allowedMentions: { parse: [] },
  };
}

export function canModerate(actor: GuildMember, target: GuildMember) {
  return (
    actor.guild.ownerId === actor.id ||
    actor.roles.highest.comparePositionTo(target.roles.highest) > 0
  );
}

export async function createCase(data: {
  guildId: string;
  type: string;
  userId: string;
  moderatorId: string;
  reason: string;
  durationMs?: number | null;
  expiresAt?: Date | null;
}) {
  return prisma.$transaction(async (tx) => {
    const last = await tx.moderationCase.findFirst({
      where: { guildId: data.guildId },
      orderBy: { number: "desc" },
      select: { number: true },
    });
    return tx.moderationCase.create({
      data: {
        ...data,
        durationMs: data.durationMs == null ? null : BigInt(data.durationMs),
        number: (last?.number ?? 0) + 1,
      },
    });
  });
}

export async function notify(
  target: User,
  guild: Guild,
  action: string,
  reason: string,
  caseNumber: number,
  duration?: string,
) {
  const actionIcon =
    action === "ban" || action === "temporary ban"
      ? icons.ban
      : action === "kick"
        ? icons.kick
        : action === "timeout"
          ? icons.timeout
          : action === "warning"
            ? icons.warning
            : action === "jail"
              ? icons.locked
              : icons.hammer;
  const actionLabel = action[0]!.toUpperCase() + action.slice(1);

  await target
    .send({
      ...v2(
        new Container().text(
          Text(`-# ${actionIcon} · Moderation action · **${actionLabel}**`),
          Text(
            [
              ``,
              `> Server: **${guild.name}**`,
              `> Case: **#${caseNumber}**`,
              duration ? `> Duration: **${duration}**` : null,
              `> Reason: ${reason}`,
            ]
              .filter(Boolean)
              .join("\n"),
          ),
        ),
      ),
      allowedMentions: { parse: [] },
    })
    .catch(() => null);
}

export function hasBotPermission(guild: Guild, permission: bigint) {
  return guild.members.me?.permissions.has(permission) ?? false;
}

export const perms = PermissionFlagsBits;
