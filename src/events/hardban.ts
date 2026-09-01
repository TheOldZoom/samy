import type Client from "@/classes/client";
import Event from "@/classes/Event";

export async function reconcileHardBans(client: Client): Promise<void> {
  const hardBans = await client.prisma.hardBan.findMany();

  for (const hardBan of hardBans) {
    const guild = client.guilds.cache.get(hardBan.guildId);
    if (!guild) continue;

    try {
      const member = await guild.members
        .fetch(hardBan.userId)
        .catch(() => null);
      if (member) {
        await member.ban({
          reason: `Hard ban: ${hardBan.reason}`,
        });
        continue;
      }

      const ban = await guild.bans.fetch(hardBan.userId).catch(() => null);
      if (!ban) {
        await guild.bans.create(hardBan.userId, {
          reason: `Hard ban: ${hardBan.reason}`,
        });
      }
    } catch (error) {
      client.logger.warn("Failed to reconcile hard ban", {
        guild: hardBan.guildId,
        user: hardBan.userId,
        error,
      });
    }
  }
}

export default new Event({
  name: "guildMemberAdd",

  async execute(client, member) {
    const hardBan = await client.prisma.hardBan.findUnique({
      where: {
        guildId_userId: {
          guildId: member.guild.id,
          userId: member.id,
        },
      },
    });

    if (!hardBan) return;

    try {
      await member.ban({
        reason: `Hard ban reapply: ${hardBan.reason}`,
      });
    } catch (error) {
      client.logger.warn("Failed to reapply hard ban on member join", {
        guild: member.guild.id,
        user: member.id,
        error,
      });
    }
  },
});
