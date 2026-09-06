import { MessageFlags, ChannelType } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand } from "@/classes/Command";
import { Container, Text } from "@/ui/components";

export default new MessageCommand({
  name: "moveall",
  description: "Move all members from one voice channel to another.",
  category: "Moderation",
  guildOnly: true,
  userPermissions: ["MoveMembers"],
  botPermissions: ["MoveMembers"],
  cooldown: 10,
  arguments: [
    {
      name: "from",
      aliases: ["f", "source"],
      type: "channel",
      description: "The voice channel to move members from.",
      required: true,
    },
    {
      name: "to",
      aliases: ["t", "target"],
      type: "channel",
      description: "The voice channel to move members to.",
      required: true,
    },
  ],

  async execute(client, message, args) {
    if (!message.guild) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.connect +
                " " +
                client.i18n.t("commands.moveall.guild_only"),
            ),
          ),
        ],
      });
      return;
    }

    const fromChannel = args.getChannel("from");
    const toChannel = args.getChannel("to");

    if (!fromChannel || fromChannel.type !== ChannelType.GuildVoice) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.connect +
                " " +
                client.i18n.t("commands.moveall.from_not_found"),
            ),
          ),
        ],
      });
      return;
    }

    if (!toChannel || toChannel.type !== ChannelType.GuildVoice) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.connect +
                " " +
                client.i18n.t("commands.moveall.to_not_found"),
            ),
          ),
        ],
      });
      return;
    }

    if (fromChannel.id === toChannel.id) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.connect +
                " " +
                client.i18n.t("commands.moveall.same_channel"),
            ),
          ),
        ],
      });
      return;
    }

    const members = fromChannel.members.values();
    let movedCount = 0;

    try {
      for (const member of members) {
        await member.voice.setChannel(toChannel).catch(() => {});
        movedCount++;
      }

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.connect +
                " " +
                client.i18n.t("commands.moveall.success", {
                  count: movedCount.toString(),
                  from: fromChannel.toString(),
                  to: toChannel.toString(),
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
            Text(
              icons.connect + " " + client.i18n.t("commands.moveall.failed"),
            ),
          ),
        ],
      });
    }
  },
});
