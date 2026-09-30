import { ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import Command from "@/classes/Command";
import prisma from "@/libs/Prisma";
import { msToHuman, parseDuration } from "@/utils/duration";
import {
  canModerate,
  createCase,
  DEFAULT_REASON,
  notify,
  response,
} from "@/utils/moderation";
export default new Command({
  name: "ban",
  description: "Ban a user, optionally temporarily.",
  ephemeral: true,
  defaultMemberPermissions: PermissionFlagsBits.BanMembers,
  options: [
    {
      name: "user",
      description: "User to ban.",
      type: ApplicationCommandOptionType.User,
      required: true,
    },

    {
      name: "reason",
      description: "Reason for the ban.",
      type: ApplicationCommandOptionType.String,
    },
    {
      name: "duration",
      description: "How long the ban should last, such as 1d or 12h.",
      type: ApplicationCommandOptionType.String,
    },
  ],
  async execute(_client, interaction) {
    if (!interaction.guild) return;
    await interaction.defer();

    const id = interaction.getOptionValue(
      "user",
      ApplicationCommandOptionType.User,
    )!;
    const reason =
      interaction.getOptionValue(
        "reason",
        ApplicationCommandOptionType.String,
      ) ?? DEFAULT_REASON;
    const durationInput = interaction.getOptionValue(
      "duration",
      ApplicationCommandOptionType.String,
    );
    const durationMs = durationInput ? parseDuration(durationInput) : null;
    if (durationInput && (!durationMs || durationMs < 1_000))
      return await interaction.reply(
        response("Enter a valid duration of at least 1 second.", true),
      );
    const user = await interaction.client.users.fetch(id);
    const member = await interaction.guild.members.fetch(id).catch(() => null);
    const actor = await interaction.guild.members.fetch(interaction.user.id);
    if (id === interaction.user.id || id === interaction.client.user.id)
      return await interaction.reply(
        response("You cannot ban that user.", true),
      );
    if (member && (!canModerate(actor, member) || !member.bannable))
      return await interaction.reply(
        response(
          "You or the bot cannot ban that member because of role hierarchy.",
          true,
        ),
      );
    const expiresAt =
      durationMs === null ? null : new Date(Date.now() + durationMs);
    const record = await createCase({
      guildId: interaction.guild.id,
      type: expiresAt ? "tempban" : "ban",
      userId: id,
      moderatorId: interaction.user.id,
      reason,
      durationMs,
      expiresAt,
    });
    await notify(
      user,
      interaction.guild,
      expiresAt ? "temporary ban" : "ban",
      reason,
      record.number,
      durationMs ? msToHuman(durationMs) : undefined,
    );
    await interaction.guild.members.ban(id, {
      reason: `${interaction.user.tag}: ${reason}`,
    });
    if (expiresAt)
      await prisma.temporaryBan.upsert({
        where: {
          guildId_userId: { guildId: interaction.guild.id, userId: id },
        },
        create: { guildId: interaction.guild.id, userId: id, expiresAt },
        update: { expiresAt },
      });
    await interaction.reply(
      response(
        `Banned **${user.tag}**${durationMs ? ` for **${msToHuman(durationMs)}**` : ""} · Case **#${record.number}**\nReason: ${reason}`,
      ),
    );
  },
});
