import { GuildChannel, MessageFlags, PermissionFlagsBits } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand } from "@/classes/Command";
import { Container, Text } from "@/ui/components";

export default new MessageCommand({
  name: "hide",
  description: "Hide or unhide a channel from a role or member.",
  category: "Moderation",
  guildOnly: true,
  userPermissions: ["ManageChannels"],
  botPermissions: ["ManageChannels", "ManageRoles"],

  arguments: [
    {
      name: "target",
      aliases: ["t", "role", "member"],
      type: ["role", "member"],
      description: "The role or member to hide from (defaults to @everyone).",
      required: false,
    },
    {
      name: "channel",
      aliases: ["c"],
      type: "channel",
      description: "The channel to hide/unhide (defaults to this channel).",
      required: false,
    },
    {
      name: "state",
      aliases: ["s"],
      type: "string",
      description: "hide, unhide, or toggle (defaults to toggle).",
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
              icons.channel + " " + client.i18n.t("commands.hide.guild_only"),
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
                client.i18n.t("commands.hide.channel_not_found"),
            ),
          ),
        ],
      });
      return;
    }

    const stateInput = (args.getString("state") ?? "toggle").toLowerCase();

    let hideState: boolean | null = null;
    if (stateInput === "hide") {
      hideState = true;
    } else if (stateInput === "unhide") {
      hideState = false;
    }

    let targetId: string | null = null;
    let targetName: string = message.guild.roles.everyone.toString();

    const targetRole = args.getRole("target");
    const targetMember = args.getMember("target");

    if (targetRole) {
      targetId = targetRole.id;
      targetName = targetRole.toString();
    } else if (targetMember) {
      targetId = targetMember.id;
      targetName = targetMember.toString();
    } else {
      targetId = message.guild.roles.everyone.id;
    }

    try {
      const overwrite = channel.permissionOverwrites.cache.get(targetId);
      const currentVisible = overwrite?.deny.has(
        PermissionFlagsBits.ViewChannel,
      );

      let shouldHide = hideState;
      if (shouldHide === null) {
        shouldHide = !currentVisible;
      }

      await channel.permissionOverwrites.edit(targetId, {
        ViewChannel: shouldHide ? false : null,
      });

      const action = shouldHide ? "hidden" : "unhidden";
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.channel +
                " " +
                client.i18n.t(`commands.hide.${action}`, {
                  channel: channel.toString(),
                  target: targetName,
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
            Text(icons.channel + " " + client.i18n.t("commands.hide.failed")),
          ),
        ],
      });
    }
  },
});
