import { GuildChannel, MessageFlags } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand } from "@/classes/Command";
import { Container, Text } from "@/ui/components";
import {
  toggleChannelOverwrites,
  announceChannelState,
  isChannelLocked,
} from "@/commands/shared/lockdown";

export default new MessageCommand({
  name: "unlock",
  description: "Unlock a channel, restoring send permissions.",
  category: "Moderation",
  guildOnly: true,
  userPermissions: ["ManageChannels"],
  botPermissions: ["ManageChannels", "ManageRoles"],

  arguments: [
    {
      name: "channel",
      aliases: ["c"],
      type: "channel",
      description: "The channel to unlock (defaults to this channel).",
      required: false,
    },
    {
      name: "reason",
      aliases: ["r"],
      type: "string",
      description: "Reason for unlocking, shown in the channel.",
      required: false,
    },
  ],

  async execute(client, message, args) {
    if (!message.guild) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.unlock + " " + client.i18n.t("commands.unlock.guild_only"),
            ),
          ),
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
            Text(
              icons.unlock +
                " " +
                client.i18n.t("commands.unlock.channel_not_found"),
            ),
          ),
        ],
      });

      return;
    }

    if (!isChannelLocked(channel, message.guild.id)) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.unlock +
                " " +
                client.i18n.t("commands.unlock.not_locked", {
                  channel: channel.toString(),
                }),
            ),
          ),
        ],
      });

      return;
    }

    const reason = args.getString("reason") ?? undefined;

    try {
      const roles = await client.prisma.lockdownRole.findMany({
        where: { guildId: message.guild.id },
      });

      const roleIds = roles.map((r) => r.roleId);

      await toggleChannelOverwrites(
        channel,
        message.guild.id,
        roleIds,
        false,
        reason,
      );
      await announceChannelState(client, channel, false, reason);

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.unlock +
                " " +
                client.i18n.t("commands.unlock.success", {
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
            Text(icons.unlock + " " + client.i18n.t("commands.unlock.failed")),
          ),
        ],
      });
    }
  },
});
