let intervalStarted = false;

export function startTemporaryRoleCleanup(client: { logger?: { error?: (message: string, data: Record<string, unknown>) => void } }): void {
  if (intervalStarted) return;
  intervalStarted = true;

  const tick = async () => {
    try {
      await runTemporaryRoleCleanup(client);
    } catch (error) {
      client.logger?.error?.("Temporary role cleanup failed", { error });
    }
  };

  setInterval(tick, 30_000);
  void tick();
}

export async function runTemporaryRoleCleanup(client: { prisma: { temporaryRole: { findMany: (args: Record<string, unknown>) => Promise<{ guildId: string; userId: string; roleId: string }[]>; delete: (args: Record<string, unknown>) => Promise<unknown> } } }): Promise<void> {
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