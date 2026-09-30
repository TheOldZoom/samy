import { ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import Command from "@/classes/Command";
import prisma from "@/libs/Prisma";
import {
  createCase,
  DEFAULT_REASON,
  notify,
  response,
} from "@/utils/moderation";

export default new Command({
  name: "unban",
  description: "Unban a user.",
  ephemeral: true,
  defaultMemberPermissions: PermissionFlagsBits.BanMembers,
  options: [
    {
      name: "user",
      description: "User to unban.",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: "reason",
      description: "Reason for the unban.",
      type: ApplicationCommandOptionType.String,
    },
  ],
  async execute(_client, interaction) {
    if (!interaction.guild) return;
    await interaction.defer();

    const userId = interaction.getOptionValue(
      "user",
      ApplicationCommandOptionType.User,
    )!;
    const reason =
      interaction.getOptionValue(
        "reason",
        ApplicationCommandOptionType.String,
      ) ?? DEFAULT_REASON;
    const ban = await interaction.guild.bans
      .fetch({ user: userId, force: true })
      .catch(() => null);
    if (!ban)
      return await interaction.reply(response("That user is not banned."));

    const unbanned = await interaction.guild.members
      .unban(userId, `${interaction.user.tag}: ${reason}`)
      .then(() => true)
      .catch(() => false);
    if (!unbanned)
      return await interaction.reply(
        response("That user is no longer banned, or I could not unban them."),
      );
    await prisma.temporaryBan.deleteMany({
      where: { guildId: interaction.guild.id, userId },
    });
    const record = await createCase({
      guildId: interaction.guild.id,
      type: "unban",
      userId,
      moderatorId: interaction.user.id,
      reason,
    });
    await notify(ban.user, interaction.guild, "unban", reason, record.number);
    await interaction.reply(
      response(
        `Unbanned **${ban.user.tag}** · Case **#${record.number}**\nReason: ${reason}`,
      ),
    );
  },
});
