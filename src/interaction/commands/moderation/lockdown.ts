import { ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import Command, { Subcommand } from "@/classes/Command";
import type { Interaction } from "@/classes/Interaction";
import type { ChatInputCommandInteraction } from "discord.js";
import prisma from "@/libs/Prisma";
import { response } from "@/utils/moderation";
async function runLockdown(
  interaction: Interaction<ChatInputCommandInteraction>,
  forceState?: boolean,
) {
  const guild = interaction.guild;
  if (!guild) return;
  await interaction.defer();

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
        "Add at least one lockdown channel with /config lockdown channel-add.",
        true,
      ),
    );
  for (const row of channels) {
    const channel = await guild.channels.fetch(row.channelId).catch(() => null);
    if (!channel || !("permissionOverwrites" in channel)) continue;
    const targets = roles.length
      ? roles.map((x) => x.roleId)
      : [guild.roles.everyone.id];
    for (const id of targets)
      await channel.permissionOverwrites
        .edit(id, {
          SendMessages: lock ? false : null,
          AddReactions: lock ? false : null,
          CreatePublicThreads: lock ? false : null,
          CreatePrivateThreads: lock ? false : null,
        })
        .catch(() => null);
  }
  await prisma.lockdown.upsert({
    where: { guildId: guild.id },
    create: { guildId: guild.id, active: lock },
    update: { active: lock },
  });
  await interaction.reply(
    response(`Server lockdown is now **${lock ? "enabled" : "disabled"}**.`),
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
