import { GuildChannel, MessageFlags, PermissionFlagsBits } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand } from "@/classes/Command";
import { Container, Text } from "@/ui/components";

export default new MessageCommand({
  name: "revokefiles",
  description: "Revoke attach files/embed permissions in a channel.",
  category: "Moderation",
  guildOnly: true,
  userPermissions: ["ManageChannels"],
  botPermissions: ["ManageChannels", "ManageRoles"],

  arguments: [
    {
      name: "channel",
      aliases: ["c"],
      type: "channel",
      description: "The channel (defaults to this channel).",
      required: false,
    },
    {
      name: "state",
      aliases: ["s"],
      type: "string",
      description: "revoke, restore, or toggle (defaults to toggle).",
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
              icons.channel +
                " " +
                client.i18n.t("commands.revokefiles.guild_only"),
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
              icons.channel +
                " " +
                client.i18n.t("commands.revokefiles.channel_not_found"),
            ),
          ),
        ],
      });
      return;
    }

    const stateInput = (args.getString("state") ?? "toggle").toLowerCase();

    let revokeState: boolean | null = null;
    if (
      stateInput === "revoke" ||
      stateInput === "on" ||
      stateInput === "disable"
    ) {
      revokeState = true;
    } else if (
      stateInput === "restore" ||
      stateInput === "off" ||
      stateInput === "enable"
    ) {
      revokeState = false;
    }

    const everyoneRole = message.guild.roles.everyone;
    const overwrite = channel.permissionOverwrites.cache.get(everyoneRole.id);
    const currentDenied =
      overwrite?.deny.has(PermissionFlagsBits.AttachFiles) ||
      overwrite?.deny.has(PermissionFlagsBits.EmbedLinks);

    const shouldRevoke = revokeState ?? !currentDenied;

    try {
      await channel.permissionOverwrites.edit(everyoneRole, {
        AttachFiles: shouldRevoke ? false : null,
        EmbedLinks: shouldRevoke ? false : null,
      });

      const action = shouldRevoke ? "revoked" : "restored";
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.channel +
                " " +
                client.i18n.t(`commands.revokefiles.${action}`, {
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
            Text(
              icons.channel +
                " " +
                client.i18n.t("commands.revokefiles.failed"),
            ),
          ),
        ],
      });
    }
  },
});
