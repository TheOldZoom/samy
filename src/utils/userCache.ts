import type { User as DiscordUser } from "discord.js";

import prisma from "@/libs/Prisma";

const PROFILE_REFRESH_MS = 3 * 24 * 60 * 60 * 1_000;
const MAX_REFRESH_ENTRIES = 50_000;
const refreshedAt = new Map<string, number>();
const pendingWrites = new Map<string, Promise<void>>();

export type CachedUser = {
  id: string;
  username: string;
  avatar: string | null;
};

function rememberRefresh(userId: string) {
  refreshedAt.delete(userId);
  refreshedAt.set(userId, Date.now());

  if (refreshedAt.size > MAX_REFRESH_ENTRIES) {
    refreshedAt.delete(refreshedAt.keys().next().value!);
  }
}

function writeDiscordUser(user: DiscordUser) {
  const pending = pendingWrites.get(user.id);
  if (pending) return pending;

  const write = prisma.user
    .upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
      },
      update: {
        username: user.username,
        avatar: user.avatar,
      },
    })
    .then(() => {
      rememberRefresh(user.id);
    })
    .finally(() => {
      pendingWrites.delete(user.id);
    });

  pendingWrites.set(user.id, write);
  return write;
}

export async function cacheDiscordUsers(...users: DiscordUser[]) {
  const unique = [...new Map(users.map((user) => [user.id, user])).values()];
  const now = Date.now();
  const stale = unique.filter((user) => {
    const lastRefresh = refreshedAt.get(user.id);
    return !lastRefresh || now - lastRefresh >= PROFILE_REFRESH_MS;
  });

  await Promise.all(stale.map(writeDiscordUser));
}

export async function refreshDiscordUserIfStale(user: DiscordUser) {
  await cacheDiscordUsers(user);
}

export function cachedAvatarUrl(user: CachedUser, size = 128) {
  if (user.avatar) {
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=${size}`;
  }

  const index = Number((BigInt(user.id) >> 22n) % 6n);
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}
