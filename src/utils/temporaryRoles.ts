let intervalStarted = false;

export function startTemporaryRoleCleanup(client: TempRoleCleanupClient): void {
  if (intervalStarted) return;
  intervalStarted = true;

  const tick = async () => {
    try {
      await runTemporaryRoleCleanup(client);
    } catch (error) {
      client.logger?.error?.("Temporary role cleanup failed", { error });
    }
  };

  setInterval(() => void tick(), 30_000);
  void tick();
}

interface TempRoleCleanupClient {
  logger?: { error?: (message: string, data: Record<string, unknown>) => void };
  prisma: {
    temporaryRole: {
      findMany: (args: Record<string, unknown>) => Promise<{ guildId: string; userId: string; roleId: string }[]>;
      delete: (args: Record<string, unknown>) => Promise<unknown>;
    };
  };
  guilds: {
    cache: {
      get: (id: string) => {
        members: {
          fetch: (userId: string) => Promise<{
            roles: {
              cache: { has: (roleId: string) => boolean };
              remove: (roleId: string, reason: string) => Promise<unknown>;
            };
          } | null>;
        };
      };
    };
  };
}

export async function runTemporaryRoleCleanup(client: TempRoleCleanupClient): Promise<void> {
  const now = new Date();
  const expired = await client.prisma.temporaryRole.findMany({
    where: { expiresAt: { lte: now } },
    take: 100,
  });

  if (expired.length === 0) return;

  for (const entry of expired) {
    const guild = client.guilds.cache.get(entry.guildId);
    if (guild) {
      try {
        const member = await guild.members.fetch(entry.userId).catch(() => null);
        if (member && member.roles.cache.has(entry.roleId)) {
          await member.roles
            .remove(entry.roleId, "Temporary role expired")
            .catch(() => null);
        }
      } catch {
        // ignore
      }
    }

    await client.prisma.temporaryRole.delete({
      where: {
        guildId_userId_roleId: {
          guildId: entry.guildId,
          userId: entry.userId,
          roleId: entry.roleId,
        },
      },
    });
  }
}