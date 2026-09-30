import Event from "@/classes/Event";
import prisma from "@/libs/Prisma";
import {
  deliverMemberMessage,
  memberMessageFailureReason,
} from "@/utils/deliverMemberMessage";

export default new Event({
  name: "guildMemberAdd",

  async execute(client, member) {
    const welcomes = await prisma.welcome.findMany({
      where: { guildId: member.guild.id },
    });

    for (const welcome of welcomes) {
      const channel = await member.guild.channels
        .fetch(welcome.channelId)
        .catch(() => null);

      if (!channel || !channel.isTextBased() || !("send" in channel)) {
        continue;
      }

      const result = await deliverMemberMessage(
        channel,
        welcome.message,
        member,
      );

      if (!result.success) {
        client.logger.error(
          {
            guildId: member.guild.id,
            channelId: welcome.channelId,
            reason: memberMessageFailureReason(result.failure),
            err:
              result.failure.type === "send-failed"
                ? result.failure.error
                : undefined,
          },
          "Failed to deliver welcome message",
        );
      }
    }
  },
});
