import { Events } from "discord.js";
import Event from "@/classes/Event";
import prisma from "@/libs/Prisma";

const CHUNK_SIZE = 100;

export default new Event({
  name: Events.ClientReady,
  once: true,

  async execute(client) {
    const rows = await prisma.forcedNickname.findMany();

    if (!rows.length) return;

    const byGuild = new Map<string, typeof rows>();

    for (const row of rows) {
      const list = byGuild.get(row.guildId) ?? [];
      list.push(row);
      byGuild.set(row.guildId, list);
    }

    let checked = 0;
    let fixed = 0;

    for (const [guildId, guildRows] of byGuild) {
      const guild =
        client.guilds.cache.get(guildId) ??
        (await client.guilds.fetch(guildId).catch(() => null));

      if (!guild) continue;

      for (let i = 0; i < guildRows.length; i += CHUNK_SIZE) {
        const chunk = guildRows.slice(i, i + CHUNK_SIZE);

        const members = await guild.members
          .fetch({ user: chunk.map((row) => row.userId) })
          .catch((error) => {
            client.logger.warn(
              { err: error, guildId },
              "Failed to fetch members for forced nickname check",
            );
            return null;
          });

        if (!members) continue;

        for (const row of chunk) {
          const member = members.get(row.userId);

          if (!member) continue;

          checked++;

          if (member.nickname === row.nickname) continue;

          await member
            .setNickname(row.nickname, "Forced nickname (startup check)")
            .then(() => {
              fixed++;
            })
            .catch((error) => {
              client.logger.warn(
                { err: error, guildId, userId: row.userId },
                "Failed to re-apply forced nickname on startup",
              );
            });
        }
      }
    }

    client.logger.info(
      `Forced nickname check: ${checked} member(s) checked, ${fixed} fixed`,
    );
  },
});
