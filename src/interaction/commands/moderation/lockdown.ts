import {
  ApplicationCommandOptionType,
  ChannelType,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type Guild,
  type GuildBasedChannel,
} from "discord.js";
import Command, { Subcommand } from "@/classes/Command";
import type { Interaction } from "@/classes/Interaction";
import prisma from "@/libs/Prisma";
import { icons } from "@/utils/icons";
import { DEFAULT_REASON, response } from "@/utils/moderation";
import { Container, Text, v2 } from "@/utils/ui/components";

async function resolveTargets(guild: Guild, channelIds: string[]) {
  const targets = new Map<string, GuildBasedChannel>();

  for (const channelId of channelIds) {
    const channel = await guild.channels.fetch(channelId).catch(() => null);

    if (!channel) continue;

    targets.set(channel.id, channel);

    if (channel.type === ChannelType.GuildCategory)
      for (const child of channel.children.cache.values())
        targets.set(child.id, child);
  }

  return targets;
}

function announce(
  channel: { send: (options: object) => Promise<unknown> },
  lock: boolean,
  reason?: string | null,
) {
  const reasonLine = reason ? `\nReason: ${reason}` : "";

  return channel
    .send({
      ...v2(
        new Container().text(
          Text(`-# ${lock ? icons.locked : icons.unlock} · Server lockdown`),
          Text(
            lock
              ? `This channel has been locked by the moderation team.${reasonLine}`
              : `The lockdown has been lifted. You can send messages again.${reasonLine}`,
          ),
        ),
      ),
      allowedMentions: { parse: [] },
    })
    .catch(() => null);
}

async function runLockdown(
  interaction: Interaction<ChatInputCommandInteraction>,
  forceState?: boolean,
) {
  const guild = interaction.guild;
  if (!guild) return;
  await interaction.defer();

  const reasonInput = interaction.getOptionValue(
    "reason",
    ApplicationCommandOptionType.String,
  );
  const reason = reasonInput ?? DEFAULT_REASON;

  const stored = await prisma.lockdown.findUnique({
    where: { guildId: guild.id },
  });
  const lock = forceState ?? !stored?.active;
  const channels = await prisma.lockdownChannel.findMany({
    where: { guildId: guild.id },
  });
  const roles = await prisma.lockdownRole.findMany({
    where: { guildId: guild.id },
  });
  if (!channels.length)
    return await interaction.reply(
      response(
        "Add at least one lockdown channel or category with /config lockdown channel-add.",
        true,
      ),
    );

  const targets = await resolveTargets(
    guild,
    channels.map((row) => row.channelId),
  );
  if (!targets.size)
    return await interaction.reply(
      response("None of the configured lockdown channels exist anymore.", true),
    );

  const roleIds = roles.length
    ? roles.map((x) => x.roleId)
    : [guild.roles.everyone.id];

  let updated = 0;
  let failed = 0;
  let noticesMissed = 0;

  for (const channel of targets.values()) {
    if (!("permissionOverwrites" in channel)) continue;

    const denied = roleIds.map(
      (id) =>
        channel.permissionOverwrites.cache
          .get(id)
          ?.deny.has(PermissionFlagsBits.SendMessages) ?? false,
    );
    const changing = lock ? !denied.every(Boolean) : denied.some(Boolean);
    const postable =
      channel.type === ChannelType.GuildText ||
      channel.type === ChannelType.GuildAnnouncement;

    if (lock && changing && postable)
      if (!(await announce(channel, true, reasonInput))) noticesMissed++;

    const results = await Promise.all(
      roleIds.map((id) =>
        channel.permissionOverwrites
          .edit(
            id,
            {
              SendMessages: lock ? false : null,
              AddReactions: lock ? false : null,
              CreatePublicThreads: lock ? false : null,
              CreatePrivateThreads: lock ? false : null,
            },
            { reason: `${interaction.user.tag}: ${reason}` },
          )
          .then(() => true)
          .catch(() => false),
      ),
    );

    if (!results.every(Boolean)) {
      failed++;
      continue;
    }

    updated++;

    if (!lock && changing && postable)
      if (!(await announce(channel, false, reasonInput))) noticesMissed++;
  }

  await prisma.lockdown.upsert({
    where: { guildId: guild.id },
    create: { guildId: guild.id, active: lock },
    update: { active: lock },
  });

  await interaction.reply(
    response(
      [
        `Server lockdown is now **${lock ? "enabled" : "disabled"}**.`,
        `${lock ? "Locked" : "Unlocked"} **${updated}** channel${updated === 1 ? "" : "s"}.`,
        failed
          ? `**${failed}** channel${failed === 1 ? "" : "s"} could not be updated. Check my permissions there.`
          : null,
        noticesMissed
          ? `I couldn't post the notice in **${noticesMissed}** channel${noticesMissed === 1 ? "" : "s"}.`
          : null,
        `Reason: ${reason}`,
      ]
        .filter(Boolean)
        .join("\n"),
    ),
  );
}

const reason = {
  name: "reason",
  description: "Reason for this change.",
  type: ApplicationCommandOptionType.String,
} as const;

export default new Command({
  name: "lockdown",
  description: "Enable or disable the configured lockdown.",
  ephemeral: true,
  defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
  cooldown: 15,
  subcommands: [
    new Subcommand({
      name: "toggle",
      description: "Toggle lockdown.",
      options: [reason],
      execute: async (_client, interaction) => runLockdown(interaction),
    }),
    new Subcommand({
      name: "on",
      description: "Enable lockdown.",
      options: [reason],
      execute: async (_client, interaction) => runLockdown(interaction, true),
    }),
    new Subcommand({
      name: "off",
      description: "Disable lockdown.",
      options: [reason],
      execute: async (_client, interaction) => runLockdown(interaction, false),
    }),
  ],
});
