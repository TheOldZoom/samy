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
  name: "unjail",
  description: "Remove the jail role from a member.",
  ephemeral: true,
  defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
  options: [
    {
      name: "user",
      description: "Member to unjail.",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: "reason",
      description: "Reason for the unjail.",
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
    const config = await prisma.moderationConfig.findUnique({
      where: { guildId: interaction.guild.id },
    });
    if (!config?.jailRoleId)
      return await interaction.reply(
        response("The jail role is not configured."),
      );

    const member = await interaction.guild.members
      .fetch(userId)
      .catch(() => null);
    const actor = await interaction.guild.members.fetch(interaction.user.id);
    if (!member || !member.roles.cache.has(config.jailRoleId))
      return await interaction.reply(response("That member is not jailed."));
    if (!canModerate(actor, member) || !member.manageable)
      return await interaction.reply(
        response(
          "You or the bot cannot unjail that member because of role hierarchy.",
        ),
      );

    await member.roles.remove(
      config.jailRoleId,
      `${interaction.user.tag}: ${reason}`,
    );
    await prisma.temporaryAction.deleteMany({
      where: { guildId: interaction.guild.id, userId, type: "jail" },
    });
    const record = await createCase({
      guildId: interaction.guild.id,
      type: "unjail",
      userId,
      moderatorId: interaction.user.id,
      reason,
    });
    await notify(
      member.user,
      interaction.guild,
      "unjail",
      reason,
      record.number,
    );
    await interaction.reply(
      response(
        `Unjailed **${member.user.tag}** · Case **#${record.number}**\nReason: ${reason}`,
      ),
    );
  },
});
