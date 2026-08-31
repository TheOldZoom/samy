import { GuildChannel, MessageFlags } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand } from "@/classes/Command";
import { Container, Text } from "@/ui/components";
import {
  toggleChannelOverwrites,
  ensureBotCanAnnounce,
  announceChannelState,
  isChannelLocked,
} from "@/commands/shared/lockdown";

export default new MessageCommand({
  name: "lock",
  description: "Lock a channel, preventing send permissions.",
  category: "Moderation",
  guildOnly: true,
  userPermissions: ["ManageChannels"],
  botPermissions: ["ManageChannels", "ManageRoles"],

  arguments: [
    {
      name: "channel",
      aliases: ["c"],
      type: "channel",
      description: "The channel to lock (defaults to this channel).",
      required: false,
    },
    {
      name: "reason",
      aliases: ["r"],
      type: "string",
      description: "Reason for locking, shown in the channel.",
      required: false,
    },
  ],

  async execute(client, message, args) {
    if (!message.guild) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(Text(icons.locked + " " + client.i18n.t("commands.lock.guild_only"))),
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
            Text(icons.locked + " " + client.i18n.t("commands.lock.channel_not_found")),
          ),
        ],
      });

      return;
    }

    if (isChannelLocked(channel, message.guild.id)) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(icons.locked + " " + client.i18n.t("commands.lock.already_locked", {
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

      const botMember = message.guild.members.me;

      if (botMember) {
        await ensureBotCanAnnounce(channel, botMember.id, reason);
      }

      await announceChannelState(client, channel, true, reason);
      await toggleChannelOverwrites(
        channel,
        message.guild.id,
        roleIds,
        true,
        reason,
      );

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(icons.locked + " " + client.i18n.t("commands.lock.success", {
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
          new Container().text(Text(icons.locked + " " + client.i18n.t("commands.lock.failed"))),
        ],
      });
    }
  },
});
