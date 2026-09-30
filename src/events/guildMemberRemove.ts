import Event from "@/classes/Event";
import prisma from "@/libs/Prisma";
import {
  deliverMemberMessage,
  memberMessageFailureReason,
} from "@/utils/deliverMemberMessage";

export default new Event({
  name: "guildMemberRemove",

  async execute(client, member) {
    const leaves = await prisma.leave.findMany({
      where: { guildId: member.guild.id },
    });

    for (const leave of leaves) {
      const channel = await member.guild.channels
        .fetch(leave.channelId)
        .catch(() => null);

      if (!channel || !channel.isTextBased() || !("send" in channel)) {
        continue;
      }

      const result = await deliverMemberMessage(channel, leave.message, member);

      if (!result.success) {
        client.logger.error(
          {
            guildId: member.guild.id,
            channelId: leave.channelId,
            reason: memberMessageFailureReason(result.failure),
            err:
              result.failure.type === "send-failed"
                ? result.failure.error
                : undefined,
          },
          "Failed to deliver leave message",
        );
      }
    }
  },
});
