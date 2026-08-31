import { MessageFlags } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand } from "@/classes/Command";
import { UserInfo } from "@/commands/shared/user";
import errorUI from "@/ui/error";

export default new MessageCommand({
  name: "user",
  description: "Get information about a user",
  category: "Utility",
  aliases: ["userinfo", "u", "whois"],
  arguments: [
    {
      name: "user",
      description: "The user to get the information from",
      aliases: ["u"],
      type: "user",
    },
  ],

  async execute(client, message, args) {
    const target = args.getUser("user") ?? message.author;
    const member = message.guild?.members.cache.get(target.id);

    try {
      const container = await UserInfo(client, target, member);

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    } catch (error) {
      client.logger.error("Failed to fetch user info", {
        error,
        user: target.id,
      });

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [errorUI(icons.Person + " " + client.i18n.t("commands.user.fetch_error"))],
      });
    }
  },
});
