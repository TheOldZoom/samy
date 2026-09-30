import Event from "@/classes/Event";
import type Client from "@/classes/Client";
import prisma from "@/libs/Prisma";

async function expireModerationActions(client: Client) {
  const now = new Date();
  for (const row of await prisma.temporaryAction.findMany({
    where: { expiresAt: { lte: now } },
  })) {
    const guild = await client.guilds.fetch(row.guildId).catch(() => null);
    const member = await guild?.members.fetch(row.userId).catch(() => null);
    if (member && row.roleId)
      await member.roles
        .remove(row.roleId, "Temporary mute expired")
        .catch(() => null);
    await prisma.temporaryAction
      .delete({ where: { id: row.id } })
      .catch(() => null);
  }
  for (const row of await prisma.temporaryBan.findMany({
    where: { expiresAt: { lte: now } },
  })) {
    const guild = await client.guilds.fetch(row.guildId).catch(() => null);
    await guild?.members
      .unban(row.userId, "Temporary ban expired")
      .catch(() => null);
    await prisma.temporaryBan
      .delete({ where: { id: row.id } })
      .catch(() => null);
  }
}
export default new Event({
  name: "ready",
  once: true,
  async execute(client) {
    await expireModerationActions(client);
    setInterval(() => expireModerationActions(client), 60_000).unref();
  },
});
