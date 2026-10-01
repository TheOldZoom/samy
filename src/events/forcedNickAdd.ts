import { Events } from "discord.js";
import Event from "@/classes/Event";
import prisma from "@/libs/Prisma";

export default new Event({
  name: Events.GuildMemberAdd,

  async execute(client, member) {
    const forced = await prisma.forcedNickname.findUnique({
      where: {
        guildId_userId: { guildId: member.guild.id, userId: member.id },
      },
    });

    if (!forced) return;

    await member
      .setNickname(forced.nickname, "Forced nickname (member rejoined)")
      .catch((error) => {
        client.logger.warn(
          { err: error, guildId: member.guild.id, userId: member.id },
          "Failed to apply forced nickname on join",
        );
      });
  },
});
