import { Elysia } from "elysia";
import type { ShardingManager } from "discord.js";

interface SerializedServer {
  id: string;
  name: string;
  icon: string | null;
  memberCount: number;
}

export default (manager: ShardingManager) =>
  new Elysia({ prefix: "/servers" }).get("/", async () => {
    let servers: SerializedServer[] = [];
    let userInstallCount = 0;

    try {
      const perShard = (await manager.broadcastEval((client) =>
        [...client.guilds.cache.values()].map((guild) => ({
          name: guild.name,
          icon: guild.iconURL({ size: 128 }),
          memberCount: guild.memberCount,
        })),
      )) as SerializedServer[][];

      servers = perShard.flat().sort((a, b) => b.memberCount - a.memberCount);

      const installs = await manager.broadcastEval(
        async (client) =>
          (await client.application?.fetch())?.approximateUserInstallCount ?? 0,
      );

      userInstallCount =
        installs.find((n) => typeof n === "number" && n > 0) ?? 0;
    } catch (error) {
      console.error("Failed to gather server data from shards", error);
    }

    const totalMembers = servers.reduce(
      (total, server) => total + server.memberCount,
      0,
    );

    return {
      servers,
      totalServers: servers.length,
      totalMembers,
      userInstallCount,
    };
  });
