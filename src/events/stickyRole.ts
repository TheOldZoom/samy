import Event from "@/classes/Event";

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