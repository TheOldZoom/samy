import type { User as DiscordUser } from "discord.js";

import prisma from "@/libs/Prisma";

export type AfkStatus = {
  reason: string | null;
  since: Date;
};

const statuses = new Map<string, AfkStatus>();

function key(guildId: string, userId: string) {
  return `${guildId}:${userId}`;
}

export async function loadAfkStatuses() {
  const stored = await prisma.afkStatus.findMany();

  statuses.clear();
  for (const status of stored) {
    statuses.set(key(status.guildId, status.userId), {
      reason: status.reason,
      since: status.since,
    });
  }
  return statuses.size;
}

export async function setAfkStatus(
  guildId: string,
  user: DiscordUser,
  reason?: string,
) {
  const since = new Date();
  const normalizedReason = reason?.trim() || null;

  await prisma.user.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
    },
    update: {},
  });
  await prisma.afkStatus.upsert({
    where: { guildId_userId: { guildId, userId: user.id } },
    create: {
      guildId,
      userId: user.id,
      reason: normalizedReason,
      since,
    },
    update: { reason: normalizedReason, since },
  });
  statuses.set(key(guildId, user.id), { reason: normalizedReason, since });
  return statuses.get(key(guildId, user.id))!;
}

export async function removeAfkStatus(guildId: string, userId: string) {
  const existed = statuses.delete(key(guildId, userId));
  const result = await prisma.afkStatus.deleteMany({
    where: { guildId, userId },
  });
  return existed || result.count > 0;
}

export function getAfkStatus(guildId: string, userId: string) {
  return statuses.get(key(guildId, userId));
}
