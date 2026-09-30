import {
  ApplicationCommandOptionType,
  ChannelType,
  PermissionFlagsBits,
} from "discord.js";

import Command, { Subcommand } from "@/classes/Command";
import prisma from "@/libs/Prisma";
import {
  buildScriptMessage,
  getVariableSource,
  replaceVariables,
} from "@/libs/scripting";
import {
  deliverMemberMessage,
  missingMemberMessagePermissions,
} from "@/utils/deliverMemberMessage";
import { ActionRow, Buttons, Container, Text, v2 } from "@/utils/ui/components";

function response(content: string) {
  return {
    ...v2(new Container().text(Text(content))),
    ephemeral: true,
    allowedMentions: { parse: [] },
  };
}

export default new Command({
  name: "leaver",
  description: "Configure leave messages for this server.",
  defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
  subcommands: [
    new Subcommand({
      name: "add",
      description: "Add or update a leave message.",
      options: [
        {
          name: "channel",
          description: "Channel for the leave message.",
          type: ApplicationCommandOptionType.Channel,
          channel_types: [ChannelType.GuildText],
          required: true,
        },
        {
          name: "message",
          description: "Plain text, an {embed} script, or a {cv2} script.",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
      async execute(client, interaction) {
        if (!interaction.guildId || !interaction.guild) return;

        const channelId = interaction.getOptionValue(
          "channel",
          ApplicationCommandOptionType.Channel,
        );
        const message = interaction
          .getOptionValue("message", ApplicationCommandOptionType.String)
          ?.trim();

        if (!channelId || !message) {
          await interaction.reply(
            response("A channel and message are required."),
          );
          return;
        }

        const source = await getVariableSource(client, interaction, message);
        const validation = buildScriptMessage(
          replaceVariables(message, source),
        );

        if (!validation.success) {
          await interaction.reply(response(validation.error));
          return;
        }

        const channel = await interaction.guild.channels
          .fetch(channelId)
          .catch(() => null);

        if (!channel || !channel.isTextBased() || !("send" in channel)) {
          await interaction.reply(response("That channel is unavailable."));
          return;
        }

        const missing = missingMemberMessagePermissions(
          channel,
          validation.message.body,
        );

        if (missing.length) {
          await interaction.reply(
            response(
              `I need these permissions in <#${channelId}>: ${missing.join(", ")}.`,
            ),
          );
          return;
        }

        await prisma.leave.upsert({
          where: {
            guildId_channelId: {
              guildId: interaction.guildId,
              channelId,
            },
          },
          update: { message },
          create: { guildId: interaction.guildId, channelId, message },
        });

        await interaction.reply(
          response(`The leave message for <#${channelId}> has been saved.`),
        );
      },
    }),

    new Subcommand({
      name: "preview",
      description: "Preview one or all configured leave messages.",
      options: [
        {
          name: "channel",
          description: "Channel to preview; omit to preview all.",
          type: ApplicationCommandOptionType.Channel,
          channel_types: [ChannelType.GuildText],
          required: false,
        },
      ],
      async execute(_client, interaction) {
        if (!interaction.guildId || !interaction.guild) return;

        await interaction.defer(true);

        const channelId = interaction.getOptionValue(
          "channel",
          ApplicationCommandOptionType.Channel,
        );
        const records = channelId
          ? [
              await prisma.leave.findUnique({
                where: {
                  guildId_channelId: {
                    guildId: interaction.guildId,
                    channelId,
                  },
                },
              }),
            ].filter((record) => record !== null)
          : await prisma.leave.findMany({
              where: { guildId: interaction.guildId },
            });

        if (!records.length) {
          await interaction.reply(
            response(
              channelId
                ? `No leave message is configured for <#${channelId}>.`
                : "No leave messages are configured.",
            ),
          );
          return;
        }

        const member = await interaction.guild.members.fetch(
          interaction.user.id,
        );
        const failed: string[] = [];

        for (const record of records) {
          const channel = await interaction.guild.channels
            .fetch(record.channelId)
            .catch(() => null);

          if (!channel || !channel.isTextBased() || !("send" in channel)) {
            failed.push(`<#${record.channelId}>`);
            continue;
          }

          const result = await deliverMemberMessage(
            channel,
            record.message,
            member,
          );

          if (!result.success) {
            failed.push(`<#${record.channelId}>`);
          }
        }

        await interaction.reply(
          response(
            failed.length
              ? `Preview failed in: ${failed.join(", ")}`
              : `Preview sent to ${records.length} channel${records.length === 1 ? "" : "s"}.`,
          ),
        );
      },
    }),

    new Subcommand({
      name: "list",
      description: "List configured leave messages.",
      async execute(_client, interaction) {
        if (!interaction.guildId) return;

        const records = await prisma.leave.findMany({
          where: { guildId: interaction.guildId },
        });
        if (!records.length) {
          await interaction.reply(
            response("No leave messages are configured."),
          );
          return;
        }

        const visible = records.slice(0, 25);
        const container = new Container().text(
          Text(
            [
              "### Configured leave messages",
              ...visible.map(
                (record, index) => `${index + 1}. <#${record.channelId}>`,
              ),
            ].join("\n"),
          ),
        );

        for (let index = 0; index < visible.length; index += 5) {
          container.actionRow(
            ActionRow(
              ...visible
                .slice(index, index + 5)
                .map((record, offset) =>
                  Buttons.secondary(
                    `View ${index + offset + 1}`,
                    `config:message:leave.${record.channelId}`,
                  ),
                ),
            ),
          );
        }

        await interaction.reply({
          ...v2(container),
          ephemeral: true,
          allowedMentions: { parse: [] },
        });
      },
    }),

    new Subcommand({
      name: "remove",
      description: "Remove a configured leave message.",
      options: [
        {
          name: "channel",
          description: "Channel to remove the leave message from.",
          type: ApplicationCommandOptionType.Channel,
          channel_types: [ChannelType.GuildText],
          required: true,
        },
      ],
      async execute(_client, interaction) {
        if (!interaction.guildId) return;

        const channelId = interaction.getOptionValue(
          "channel",
          ApplicationCommandOptionType.Channel,
        );

        if (!channelId) return;

        const record = await prisma.leave.findUnique({
          where: {
            guildId_channelId: {
              guildId: interaction.guildId,
              channelId,
            },
          },
        });

        if (!record) {
          await interaction.reply(
            response(`No leave message is configured for <#${channelId}>.`),
          );
          return;
        }

        await prisma.leave.delete({
          where: {
            guildId_channelId: {
              guildId: interaction.guildId,
              channelId,
            },
          },
        });

        await interaction.reply(
          response(`The leave message for <#${channelId}> was removed.`),
        );
      },
    }),
  ],
});
