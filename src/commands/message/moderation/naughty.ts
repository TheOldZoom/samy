import { GuildChannel, MessageFlags } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand } from "@/classes/Command";
import { Container, Text } from "@/ui/components";

export default new MessageCommand({
  name: "naughty",
  description: "Toggle NSFW on a channel.",
  category: "Moderation",
  guildOnly: true,
  userPermissions: ["ManageChannels"],
  botPermissions: ["ManageChannels"],

  arguments: [
    {
      name: "channel",
      aliases: ["c"],
      type: "channel",
      description: "The channel to toggle NSFW (defaults to this channel).",
      required: false,
    },
    {
      name: "state",
      aliases: ["s"],
      type: "string",
      description: "on, off, or toggle (defaults to toggle).",
      required: false,
    },
  ],

  async execute(client, message, args) {
    if (!message.guild) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(Text(icons.channel + " " + client.i18n.t("commands.naughty.guild_only"))),
        ],
      });
      return;
    }

    const channel = args.getChannel("channel") ?? message.channel;

    if (!channel || !(channel instanceof GuildChannel)) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(icons.channel + " " + client.i18n.t("commands.naughty.channel_not_found")),
          ),
        ],
      });
      return;
    }

    if (!channel.isTextBased()) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(icons.channel + " " + client.i18n.t("commands.naughty.text_only")),
          ),
        ],
      });
      return;
    }

    const stateInput = (args.getString("state") ?? "toggle").toLowerCase();

    let nsfwState: boolean | null = null;
    if (stateInput === "on" || stateInput === "enable" || stateInput === "true") {
      nsfwState = true;
    } else if (stateInput === "off" || stateInput === "disable" || stateInput === "false") {
      nsfwState = false;
    }

    try {
      const currentNsfw = "nsfw" in channel ? channel.nsfw : false;
      const shouldNsfw = nsfwState ?? !currentNsfw;

      await channel.setNSFW(shouldNsfw);

      const action = shouldNsfw ? "enabled" : "disabled";
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.channel +
                " " +
                client.i18n.t(`commands.naughty.${action}`, {
                  channel: channel.toString(),
                }),
            ),
          ),
        ],
      });
    } catch {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(icons.channel + " " + client.i18n.t("commands.naughty.failed")),
          ),
        ],
      });
    }
  },
});
