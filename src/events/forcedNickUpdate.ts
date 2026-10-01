import { Events } from "discord.js";
import Event from "@/classes/Event";
import prisma from "@/libs/Prisma";

export default new Event({
  name: Events.GuildMemberUpdate,

  async execute(client, oldMember, newMember) {
    if (!oldMember.partial && oldMember.nickname === newMember.nickname) return;

    const forced = await prisma.forcedNickname.findUnique({
      where: {
        guildId_userId: { guildId: newMember.guild.id, userId: newMember.id },
      },
    });

    if (!forced || newMember.nickname === forced.nickname) return;

    await newMember
      .setNickname(forced.nickname, "Forced nickname")
      .catch((error) => {
        client.logger.warn(
          { err: error, guildId: newMember.guild.id, userId: newMember.id },
          "Failed to re-apply forced nickname",
        );
      });
  },
});
