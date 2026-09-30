import { Events, MessageFlags } from "discord.js";
import Event from "@/classes/Event";
import { getMentionLinksEnabled } from "@/libs/GuildConfig";
import { linkHandlers } from "@/utils/links";

export default new Event({
  name: Events.MessageCreate,

  execute: async (client, message) => {
    if (message.author.bot || !client.user) return;
    if (
      !message.mentions.has(client.user, {
        ignoreEveryone: true,
        ignoreRoles: true,
      })
    )
      return;

    if (!message.guildId) return;

    if (!(await getMentionLinksEnabled(message.guildId))) return;

    for (const handler of linkHandlers) {
      const match = message.content.match(handler.pattern);
      if (!match) continue;

      try {
        const containers = await handler.run(match);
        if (!containers) return;

        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: containers,
          allowedMentions: { repliedUser: false },
        });
      } catch (error) {
        client.logger.error("Failed to handle link", { error, url: match[0] });
      }
      return;
    }
  },
});
