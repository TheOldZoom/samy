import {
  ChannelType,
  MessageFlags,
  type GuildBasedChannel,
  type GuildMember,
} from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand } from "@/classes/Command";
import { Container, Text } from "@/ui/components";
import { ArgumentRegistry } from "@/utils/parser/Resolver";

export default new MessageCommand({
  name: "drag",
  description: "Drag member(s) into a voice channel.",
  category: "Moderation",
  guildOnly: true,
  userPermissions: ["MoveMembers"],
  botPermissions: ["MoveMembers"],

  arguments: [
    {
      name: "targets",
      aliases: ["t"],
      type: "string",
      description:
        "Members and optional voice channel (mentions/IDs, last token can be channel).",
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
              icons.connect + " " + client.i18n.t("commands.drag.guild_only"),
            ),
          ),
        ],
      });
      return;
    }

    const targetsInput = args.getString("targets") ?? "";
    const parts = targetsInput.split(/\s+/).filter(Boolean);

    if (parts.length === 0) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.connect + " " + client.i18n.t("commands.drag.no_members"),
            ),
          ),
        ],
      });
      return;
    }

    let toChannel: GuildBasedChannel | null = null;
    let memberParts = parts;

    const lastToken = parts[parts.length - 1]!;
    const channelArg = ArgumentRegistry.get("channel");

    if (channelArg && parts.length > 1) {
      const channelResult = await channelArg.resolve(lastToken, {
        client,
        message,
        raw: lastToken,
      });

      if (channelResult.success) {
        const resolvedChannel = channelResult.value as GuildBasedChannel | null;
        if (
          resolvedChannel &&
          resolvedChannel.type === ChannelType.GuildVoice
        ) {
          toChannel = resolvedChannel;
          memberParts = parts.slice(0, -1);
        }
      }
    }

    if (!toChannel) {
      const member = message.member;
      if (
        member?.voice.channel &&
        member.voice.channel.type === ChannelType.GuildVoice
      ) {
        toChannel = member.voice.channel;
      } else {
        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(
                icons.connect + " " + client.i18n.t("commands.drag.no_channel"),
              ),
            ),
          ],
        });
        return;
      }
    }

    const memberArg = ArgumentRegistry.get("memberList");
    if (!memberArg) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(icons.connect + " " + client.i18n.t("commands.drag.failed")),
          ),
        ],
      });
      return;
    }

    const memberResult = await memberArg.resolve(memberParts.join(" "), {
      client,
      message,
      raw: memberParts.join(" "),
    });

    if (!memberResult.success) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.connect + " " + client.i18n.t("commands.drag.no_members"),
            ),
          ),
        ],
      });
      return;
    }

    const members = memberResult.value as GuildMember[];
    if (!members.length) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.connect + " " + client.i18n.t("commands.drag.no_members"),
            ),
          ),
        ],
      });
      return;
    }

    let movedCount = 0;
    let failedCount = 0;

    try {
      for (const member of members) {
        try {
          await member.voice.setChannel(toChannel);
          movedCount++;
        } catch {
          failedCount++;
        }
      }

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.connect +
                " " +
                client.i18n.t("commands.drag.success", {
                  count: movedCount.toString(),
                  channel: toChannel.toString(),
                  failed: failedCount.toString(),
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
            Text(icons.connect + " " + client.i18n.t("commands.drag.failed")),
          ),
        ],
      });
    }
  },
});
