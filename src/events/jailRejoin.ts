import Event from "@/classes/Event";
import { getJailConfig } from "@/utils/jail";

export default new Event({
  name: "guildMemberAdd",

  async execute(client, member) {
    // Check if user is jailed
    const jailed = await client.prisma.jailedMember.findUnique({
      where: {
        guildId_userId: {
          guildId: member.guild.id,
          userId: member.id,
        },
      },
    });

    if (jailed) {
      const jailConfig = await getJailConfig(member.guild.id);
      if (jailConfig.jailRoleId) {
        await member.roles
          .set([jailConfig.jailRoleId], "Reapplying jail role on rejoin")
          .catch(() => null);
      }
      return;
    }

    // Check if user has active temporary mutes
    const mutes = await client.prisma.temporaryMute.findMany({
      where: {
        guildId: member.guild.id,
        userId: member.id,
      },
    });

    for (const mute of mutes) {
      if (mute.expiresAt.getTime() > Date.now()) {
        await member.roles
          .add(mute.roleId, `Reapplying ${mute.type} mute on rejoin`)
          .catch(() => null);
      }
    }
  },
});
