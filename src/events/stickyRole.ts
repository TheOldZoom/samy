import type Client from "@/classes/client";
import Event from "@/classes/Event";

export async function reconcileStickyRoles(client: Client): Promise<void> {
  const stickies = await client.prisma.stickyRole.findMany();

  for (const sticky of stickies) {
    const guild = client.guilds.cache.get(sticky.guildId);
    if (!guild) continue;

    const botMember = guild.members.me;
    if (!botMember) continue;

    const role = guild.roles.cache.get(sticky.roleId);
    if (
      !role ||
      role.managed ||
      role.position >= botMember.roles.highest.position
    )
      continue;

    try {
      const member = await guild.members.fetch(sticky.userId).catch(() => null);
      if (member && !member.roles.cache.has(sticky.roleId)) {
        await member.roles.add(
          sticky.roleId,
          "Sticky role reapplied on startup",
        );
      }
    } catch (error) {
      client.logger.warn("Failed to reconcile sticky role on startup", {
        guild: sticky.guildId,
        user: sticky.userId,
        error,
      });
    }
  }
}

export default new Event({
  name: "guildMemberAdd",

  async execute(client, member) {
    const stickies = await client.prisma.stickyRole.findMany({
      where: { guildId: member.guild.id, userId: member.id },
    });

    if (stickies.length === 0) return;

    const botMember = member.guild.members.me;
    if (!botMember) return;

    const validRoleIds: string[] = [];

    for (const sticky of stickies) {
      const role = member.guild.roles.cache.get(sticky.roleId);
      if (!role) continue;
      if (role.managed) continue;
      if (role.position >= botMember.roles.highest.position) continue;
      validRoleIds.push(role.id);
    }

    if (validRoleIds.length === 0) return;

    try {
      await member.roles.add(validRoleIds, "Sticky role reapplied");
    } catch (error) {
      client.logger.warn("Failed to reapply sticky roles", {
        guild: member.guild.id,
        user: member.id,
        error,
      });
    }
  },
});
