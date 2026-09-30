import {
  ApplicationCommandOptionType,
  ChannelType,
  PermissionFlagsBits,
  type Guild,
  type GuildMember,
  type Role,
  type TextChannel,
  type ChatInputCommandInteraction,
} from "discord.js";
import { Subcommand, SubcommandGroup } from "@/classes/Command";
import type { Interaction } from "@/classes/Interaction";
import prisma from "@/libs/Prisma";
import { response } from "@/utils/moderation";
async function requireAdmin(
  interaction: Interaction<ChatInputCommandInteraction>,
) {
  if (interaction.memberPermissions?.has(PermissionFlagsBits.Administrator))
    return true;
  await interaction.reply(
    response("Administrator permission is required for this setting.", true),
  );
  return false;
}

export async function ensureJailPermissions(
  guild: Guild,
  role: Role,
  channel: TextChannel,
  botMember: GuildMember,
) {
  await channel.permissionOverwrites
    .edit(
      guild.roles.everyone,
      { ViewChannel: false },
      { reason: "Jail channel setup: isolate from @everyone" },
    )
    .catch(() => null);
  await channel.permissionOverwrites
    .edit(
      role,
      {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
      },
      { reason: "Jail channel setup: allow jailed role" },
    )
    .catch(() => null);
  await channel.permissionOverwrites
    .edit(
      botMember,
      {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        ManageChannels: true,
      },
      { reason: "Jail channel setup: allow bot" },
    )
    .catch(() => null);

  for (const guildChannel of guild.channels.cache.values()) {
    if (
      guildChannel.id === channel.id ||
      !("permissionOverwrites" in guildChannel)
    )
      continue;
    await guildChannel.permissionOverwrites
      .edit(
        role,
        { ViewChannel: false, SendMessages: false },
        { reason: "Jail isolation" },
      )
      .catch(() => null);
  }
}

async function muteRole(
  guild: Guild,
  kind: "imute" | "rmute",
  chosen?: string,
) {
  const config = await prisma.moderationConfig.findUnique({
    where: { guildId: guild.id },
  });
  const configuredRoleId =
    kind === "imute" ? config?.imageMuteRoleId : config?.reactionMuteRoleId;
  const roleId = chosen ?? configuredRoleId;
  let role = roleId ? await guild.roles.fetch(roleId).catch(() => null) : null;
  if (!role)
    role = await guild.roles.create({
      name: kind === "imute" ? "Image Muted" : "Reaction Muted",
      reason: "Moderation configuration",
    });
  const deny =
    kind === "imute"
      ? { AttachFiles: false, EmbedLinks: false }
      : { AddReactions: false };
  for (const channel of guild.channels.cache.values())
    if ("permissionOverwrites" in channel)
      await channel.permissionOverwrites.edit(role, deny).catch(() => null);
  await prisma.moderationConfig.upsert({
    where: { guildId: guild.id },
    create: {
      guildId: guild.id,
      [kind === "imute" ? "imageMuteRoleId" : "reactionMuteRoleId"]: role.id,
    },
    update: {
      [kind === "imute" ? "imageMuteRoleId" : "reactionMuteRoleId"]: role.id,
    },
  });
  return role;
}
function muteGroup(kind: "imute" | "rmute") {
  const label = kind === "imute" ? "image mute" : "reaction mute";
  return new SubcommandGroup({
    name: kind,
    description: `Configure the ${label} role.`,
    subcommands: [
      new Subcommand({
        name: "setup",
        description: `Set up the ${label} role.`,
        ephemeral: true,
        options: [
          {
            name: "role",
            description: "Existing role to use.",
            type: ApplicationCommandOptionType.Role,
          },
        ],
        async execute(_client, interaction) {
          await interaction.defer(true);

          if (!interaction.guild || !(await requireAdmin(interaction))) return;
          const role = await muteRole(
            interaction.guild,
            kind,
            interaction.getOptionValue(
              "role",
              ApplicationCommandOptionType.Role,
            ),
          );
          await interaction.reply(
            response(`Configured ${role} as the ${label} role.`, true),
          );
        },
      }),
      new Subcommand({
        name: "role",
        description: `Set the ${label} role.`,
        ephemeral: true,
        options: [
          {
            name: "role",
            description: "Role to use.",
            type: ApplicationCommandOptionType.Role,
            required: true,
          },
        ],
        async execute(_client, interaction) {
          await interaction.defer(true);

          if (!interaction.guild || !(await requireAdmin(interaction))) return;
          const role = await muteRole(
            interaction.guild,
            kind,
            interaction.getOptionValue(
              "role",
              ApplicationCommandOptionType.Role,
            ),
          );
          await interaction.reply(
            response(`Configured ${role} as the ${label} role.`, true),
          );
        },
      }),
    ],
  });
}
export const imuteConfig = muteGroup("imute");
export const rmuteConfig = muteGroup("rmute");
export const jailConfig = new SubcommandGroup({
  name: "jail",
  description: "Configure the server jail.",
  subcommands: [
    new Subcommand({
      name: "setup",
      description: "Set up the jail role and channel.",
      ephemeral: true,
      options: [
        {
          name: "role",
          description: "Existing jail role.",
          type: ApplicationCommandOptionType.Role,
        },
        {
          name: "channel",
          description: "Existing jail channel.",
          type: ApplicationCommandOptionType.Channel,
          channel_types: [ChannelType.GuildText],
        },
      ],
      async execute(_client, interaction) {
        await interaction.defer(true);

        if (!interaction.guild || !(await requireAdmin(interaction))) return;
        const chosenRoleId = interaction.getOptionValue(
          "role",
          ApplicationCommandOptionType.Role,
        );
        const chosenChannelId = interaction.getOptionValue(
          "channel",
          ApplicationCommandOptionType.Channel,
        );
        const config = await prisma.moderationConfig.findUnique({
          where: { guildId: interaction.guild.id },
        });
        const existingRoleId = chosenRoleId ?? config?.jailRoleId;
        let role = existingRoleId
          ? await interaction.guild.roles
              .fetch(existingRoleId)
              .catch(() => null)
          : null;
        if (!role)
          role = await interaction.guild.roles.create({
            name: "Jailed",
            permissions: [],
            reason: `Jail system setup by ${interaction.user.tag}`,
          });
        const existingChannelId = chosenChannelId ?? config?.jailChannelId;
        let channel = existingChannelId
          ? await interaction.guild.channels
              .fetch(existingChannelId)
              .catch(() => null)
          : null;
        if (!channel || channel.type !== ChannelType.GuildText)
          channel = await interaction.guild.channels.create({
            name: "jail",
            type: ChannelType.GuildText,
            topic: "Jail room for restricted members.",
            permissionOverwrites: [
              {
                id: interaction.guild.roles.everyone.id,
                deny: [PermissionFlagsBits.ViewChannel],
              },
              {
                id: role.id,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.ReadMessageHistory,
                ],
              },
            ],
            reason: `Jail system setup by ${interaction.user.tag}`,
          });
        const botMember =
          interaction.guild.members.me ??
          (await interaction.guild.members.fetchMe());
        await ensureJailPermissions(
          interaction.guild,
          role,
          channel,
          botMember,
        );
        await prisma.moderationConfig.upsert({
          where: { guildId: interaction.guild.id },
          create: {
            guildId: interaction.guild.id,
            jailRoleId: role.id,
            jailChannelId: channel.id,
          },
          update: { jailRoleId: role.id, jailChannelId: channel.id },
        });
        await interaction.reply(
          response(`Jail configured with ${role} and ${channel}.`, true),
        );
      },
    }),
    new Subcommand({
      name: "role",
      description: "Set the jail role.",
      ephemeral: true,
      options: [
        {
          name: "role",
          description: "Jail role.",
          type: ApplicationCommandOptionType.Role,
          required: true,
        },
      ],
      async execute(_client, interaction) {
        await interaction.defer(true);

        if (!interaction.guildId || !(await requireAdmin(interaction))) return;
        const id = interaction.getOptionValue(
          "role",
          ApplicationCommandOptionType.Role,
        )!;
        await prisma.moderationConfig.upsert({
          where: { guildId: interaction.guildId },
          create: { guildId: interaction.guildId, jailRoleId: id },
          update: { jailRoleId: id },
        });
        await interaction.reply(response(`Jail role set to <@&${id}>.`, true));
      },
    }),
    new Subcommand({
      name: "channel",
      description: "Set the jail channel.",
      ephemeral: true,
      options: [
        {
          name: "channel",
          description: "Jail channel.",
          type: ApplicationCommandOptionType.Channel,
          channel_types: [ChannelType.GuildText],
          required: true,
        },
      ],
      async execute(_client, interaction) {
        await interaction.defer(true);

        if (!interaction.guildId || !(await requireAdmin(interaction))) return;
        const id = interaction.getOptionValue(
          "channel",
          ApplicationCommandOptionType.Channel,
        )!;
        await prisma.moderationConfig.upsert({
          where: { guildId: interaction.guildId },
          create: { guildId: interaction.guildId, jailChannelId: id },
          update: { jailChannelId: id },
        });
        await interaction.reply(
          response(`Jail channel set to <#${id}>.`, true),
        );
      },
    }),
    new Subcommand({
      name: "view",
      description: "View jail configuration.",
      ephemeral: true,
      async execute(_client, interaction) {
        await interaction.defer(true);

        if (!interaction.guildId) return;
        const config = await prisma.moderationConfig.findUnique({
          where: { guildId: interaction.guildId },
        });
        await interaction.reply(
          response(
            `Jail role: ${config?.jailRoleId ? `<@&${config.jailRoleId}>` : "Not configured"}\nJail channel: ${config?.jailChannelId ? `<#${config.jailChannelId}>` : "Not configured"}`,
            true,
          ),
        );
      },
    }),
  ],
});
function lockSub(
  name: string,
  kind: "channel" | "role",
  action: "add" | "remove" | "list",
) {
  const targetLabel = kind[0]!.toUpperCase() + kind.slice(1);
  return new Subcommand({
    name,
    description: `${action} lockdown ${kind}s.`,
    ephemeral: true,
    options:
      action === "list"
        ? undefined
        : [
            {
              name: kind,
              description: `${targetLabel} to ${action}.`,
              type:
                kind === "channel"
                  ? ApplicationCommandOptionType.Channel
                  : ApplicationCommandOptionType.Role,
              required: true,
            },
          ],
    async execute(_client, interaction) {
      await interaction.defer(true);

      if (!interaction.guildId) return;
      if (action === "list") {
        const mentions =
          kind === "channel"
            ? (
                await prisma.lockdownChannel.findMany({
                  where: { guildId: interaction.guildId },
                })
              ).map((row) => `<#${row.channelId}>`)
            : (
                await prisma.lockdownRole.findMany({
                  where: { guildId: interaction.guildId },
                })
              ).map((row) => `<@&${row.roleId}>`);
        await interaction.reply(
          response(
            mentions.length
              ? mentions.join("\n")
              : `No lockdown ${kind}s configured.`,
            true,
          ),
        );
        return;
      }
      const id = interaction.getOptionValue(
        kind,
        kind === "channel"
          ? ApplicationCommandOptionType.Channel
          : ApplicationCommandOptionType.Role,
      )!;
      if (kind === "channel" && action === "add") {
        await prisma.lockdownChannel.upsert({
          where: {
            guildId_channelId: { guildId: interaction.guildId, channelId: id },
          },
          create: { guildId: interaction.guildId, channelId: id },
          update: {},
        });
      } else if (kind === "channel") {
        await prisma.lockdownChannel.deleteMany({
          where: { guildId: interaction.guildId, channelId: id },
        });
      } else if (action === "add") {
        await prisma.lockdownRole.upsert({
          where: {
            guildId_roleId: { guildId: interaction.guildId, roleId: id },
          },
          create: { guildId: interaction.guildId, roleId: id },
          update: {},
        });
      } else {
        await prisma.lockdownRole.deleteMany({
          where: { guildId: interaction.guildId, roleId: id },
        });
      }
      await interaction.reply(
        response(
          `${targetLabel} ${action === "add" ? "added to" : "removed from"} lockdown.`,
          true,
        ),
      );
    },
  });
}
export const lockdownConfig = new SubcommandGroup({
  name: "lockdown",
  description: "Configure lockdown targets.",
  subcommands: [
    lockSub("channel-add", "channel", "add"),
    lockSub("channel-list", "channel", "list"),
    lockSub("channel-remove", "channel", "remove"),
    lockSub("role-add", "role", "add"),
    lockSub("role-list", "role", "list"),
    lockSub("role-remove", "role", "remove"),
  ],
});
