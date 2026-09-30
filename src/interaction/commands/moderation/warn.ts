import { ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import Command from "@/classes/Command";
import prisma from "@/libs/Prisma";
import {
  canModerate,
  createCase,
  DEFAULT_REASON,
  notify,
  response,
} from "@/utils/moderation";
export default new Command({
  name: "warn",
  description: "Warn a member.",
  ephemeral: true,
  defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
  options: [
    {
      name: "user",
      description: "Member to warn.",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: "reason",
      description: "Reason for the warning.",
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
    const member = await interaction.guild.members.fetch(id).catch(() => null);
    const actor = await interaction.guild.members.fetch(interaction.user.id);
    if (
      !member ||
      id === interaction.user.id ||
      id === interaction.client.user.id ||
      !canModerate(actor, member)
    )
      return await interaction.reply(
        response("That member cannot be warned.", true),
      );
    await prisma.warning.create({
      data: {
        guildId: interaction.guild.id,
        userId: id,
        moderatorId: interaction.user.id,
        reason,
      },
    });
    const record = await createCase({
      guildId: interaction.guild.id,
      type: "warn",
      userId: id,
      moderatorId: interaction.user.id,
      reason,
    });
    await notify(
      member.user,
      interaction.guild,
      "warning",
      reason,
      record.number,
    );
    await interaction.reply(
      response(
        `Warned **${member.user.tag}** · Case **#${record.number}**\nReason: ${reason}`,
      ),
    );
  },
});
