import { MessageFlags } from "discord.js";

import type Client from "@/classes/client";
import { Container, Text } from "@/ui/components";
import prisma from "@/libs/prisma";
import { ensureGuild } from "@/utils/guild";

const MAX_TIMER_MS = 2_147_000_000;

const timers = new Map<string, ReturnType<typeof setTimeout>>();

function getKey(guildId: string, userId: string): string {
  return `${guildId}:${userId}`;
}

function clearTimer(guildId: string, userId: string): void {
  const key = getKey(guildId, userId);
  const timer = timers.get(key);

  if (!timer) return;

  clearTimeout(timer);
  timers.delete(key);
}

async function processGuildBan(
  client: Client,
  guildId: string,
  userId: string,
): Promise<void> {
  const guildBan = await prisma.guildBan.findUnique({
    where: {
      guildId_userId: {
        guildId,
        userId,
      },
    },
  });

  if (!guildBan) {
    clearTimer(guildId, userId);
    return;
  }

  if (guildBan.expiresAt.getTime() > Date.now()) {
    scheduleGuildBan(client, guildBan);
    return;
  }

  const guild = client.guilds.cache.get(guildId);

  if (!guild) {
    clearTimer(guildId, userId);
    return;
  }

  try {
    const ban = await guild.bans.fetch(userId).catch(() => null);

    if (ban) {
      await guild.members.unban(userId, "Temporary ban expired");

      try {
        const user = await client.users.fetch(userId);

        await user.send({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(
                client.i18n.t("commands.unban.dm", {
                  guild: guild.name,
                  reason: guildBan.reason,
                }),
              ),
            ),
          ],
        });
      } catch {
        // ignore
      }
    }

    await prisma.guildBan.delete({
      where: {
        guildId_userId: {
          guildId,
          userId,
        },
      },
    });

    clearTimer(guildId, userId);
  } catch {
    scheduleGuildBan(client, guildBan);
  }
}

function scheduleGuildBan(
  client: Client,
  guildBan: {
    guildId: string;
    userId: string;
    expiresAt: Date;
  },
): void {
  const key = getKey(guildBan.guildId, guildBan.userId);

  clearTimer(guildBan.guildId, guildBan.userId);

  const remaining = guildBan.expiresAt.getTime() - Date.now();

  if (remaining <= 0) {
    void processGuildBan(client, guildBan.guildId, guildBan.userId);
    return;
  }

  const delay = Math.min(remaining, MAX_TIMER_MS);

  const timer = setTimeout(() => {
    timers.delete(key);

    void processGuildBan(client, guildBan.guildId, guildBan.userId);
  }, delay);

  timers.set(key, timer);
}

export async function createGuildBan({
  client,
  guildId,
  userId,
  reason,
  durationMs,
}: {
  client: Client;
  guildId: string;
  userId: string;
  reason: string;
  durationMs: number;
}): Promise<void> {
  const expiresAt = new Date(Date.now() + durationMs);

  await ensureGuild(guildId);

  const guildBan = await prisma.guildBan.upsert({
    where: {
      guildId_userId: {
        guildId,
        userId,
      },
    },
    update: {
      reason,
      expiresAt,
    },
    create: {
      guildId,
      userId,
      reason,
      expiresAt,
    },
  });

  scheduleGuildBan(client, guildBan);
}

export async function cancelGuildBan(
  guildId: string,
  userId: string,
): Promise<void> {
  clearTimer(guildId, userId);

  await prisma.guildBan.deleteMany({
    where: {
      guildId,
      userId,
    },
  });
}

export async function reconcileGuildBans(client: Client): Promise<void> {
  const guildBans = await prisma.guildBan.findMany();

  for (const guildBan of guildBans) {
    scheduleGuildBan(client, guildBan);
  }
}
