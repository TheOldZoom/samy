import Event from "@/classes/Event";

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
