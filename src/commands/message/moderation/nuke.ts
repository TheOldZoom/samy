import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ComponentType,
  MessageFlags,
  SeparatorBuilder,
  type TextChannel,
} from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand } from "@/classes/Command";
import { Container, Text } from "@/ui/components";
import { checkPermissions } from "@/utils/permission";
import type Client from "@/classes/client";

export default new MessageCommand({
  name: "nuke",
  description: "Delete and recreate a channel.",
  category: "Moderation",
  guildOnly: true,
  userPermissions: ["ManageChannels"],
  botPermissions: ["ManageChannels"],

  arguments: [
    {
      name: "channel",
      description: "The channel to nuke.",
      type: "channel",
    },
  ],

  async execute(client, message, args) {
    const channel = args.getChannel("channel") ?? message.channel;

    if (
      channel.type !== ChannelType.GuildText &&
      channel.type !== ChannelType.GuildAnnouncement
    ) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(icons.delete + " " + client.i18n.t("commands.nuke.text_channel_only")),
          ),
        ],
      });

      return;
    }

    const guild = message.guild!;
    const oldChannel = channel as TextChannel;

    if (
      guild.rulesChannelId === oldChannel.id ||
      guild.publicUpdatesChannelId === oldChannel.id ||
      guild.systemChannelId === oldChannel.id
    ) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(Text(icons.delete + " " + client.i18n.t("commands.nuke.protected"))),
        ],
      });

      return;
    }

    if (!checkPermissions(message.member!, oldChannel, ["ManageChannels"])) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(icons.delete + " " + client.i18n.t("commands.nuke.missing_permission")),
          ),
        ],
      });

      return;
    }

    const nukeButton = new ButtonBuilder()
      .setCustomId(`nuke:${oldChannel.id}`)
      .setLabel(client.i18n.t("commands.nuke.button"))
      .setStyle(ButtonStyle.Danger);

    const cancelButton = new ButtonBuilder()
      .setCustomId(`cancel:${oldChannel.id}`)
      .setLabel(client.i18n.t("general.cancel"))
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      cancelButton,
      nukeButton,
    );

    const confirmation = await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container()
          .text(
            Text(icons.delete + " " + client.i18n.t("commands.nuke.confirm", {
                channel: oldChannel.toString(),
              }),
            ),
          )
          .separator(new SeparatorBuilder().setDivider(true))
          .actionRow(row),
      ],
    });

    try {
      const interaction = await confirmation.awaitMessageComponent({
        componentType: ComponentType.Button,
        time: 30_000,
        filter: (i) =>
          i.user.id === message.author.id &&
          (i.customId === `nuke:${oldChannel.id}` ||
            i.customId === `cancel:${oldChannel.id}`),
      });

      if (interaction.customId === `cancel:${oldChannel.id}`) {
        await interaction.update({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(icons.delete + " " + client.i18n.t("commands.nuke.cancelled")),
            ),
          ],
        });

        return;
      }

      const member = await guild.members.fetch(interaction.user.id);

      if (!checkPermissions(member, oldChannel, ["ManageChannels"])) {
        await interaction.reply({
          ephemeral: true,
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(icons.delete + " " + client.i18n.t("commands.nuke.permission_revoked")),
            ),
          ],
        });

        return;
      }

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(icons.delete + " " + client.i18n.t("commands.nuke.recreating", {
                user: interaction.user.toString(),
                channel: oldChannel.toString(),
              }),
            ),
          ),
        ],
      });

      const clone = await oldChannel.clone({
        name: oldChannel.name,
        reason: `Channel nuked by ${interaction.user.tag}`,
      });

      await clone.setPosition(oldChannel.position);

      await oldChannel.delete(`Channel nuked by ${interaction.user.tag}`);

      await migrateChannelData(client, oldChannel.id, clone.id);

      await clone.send({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(icons.delete + " " + client.i18n.t("commands.nuke.complete", {
                user: interaction.user.toString(),
              }),
            ),
          ),
        ],
      });
    } catch {
      await confirmation.edit({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(Text(icons.delete + " " + client.i18n.t("commands.nuke.timeout"))),
        ],
      });
    }
  },
});

async function migrateChannelData(
  client: Client,
  oldChannelId: string,
  cloneId: string,
) {
  await client.prisma.welcome.updateMany({
    where: {
      channelId: oldChannelId,
    },
    data: {
      channelId: cloneId,
    },
  });
}
