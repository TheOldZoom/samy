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

export function unmuteRoleCommand(kind: "imute" | "rmute") {
  const name = kind === "imute" ? "iunmute" : "runmute";
  const label = kind === "imute" ? "image mute" : "reaction mute";

  return new Command({
    name,
    description: `Remove an ${label} role from a member.`,
    ephemeral: true,
    defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
    options: [
      {
        name: "user",
        description: "Member to unmute.",
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: "reason",
        description: "Reason for the unmute.",
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
      const roleId =
        kind === "imute" ? config?.imageMuteRoleId : config?.reactionMuteRoleId;
      if (!roleId)
        return await interaction.reply(
          response(`The ${label} role is not configured.`),
        );

      const member = await interaction.guild.members
        .fetch(userId)
        .catch(() => null);
      const actor = await interaction.guild.members.fetch(interaction.user.id);
      if (!member || !member.roles.cache.has(roleId))
        return await interaction.reply(
          response(`That member does not have the ${label} role.`),
        );
      if (!canModerate(actor, member) || !member.manageable)
        return await interaction.reply(
          response(
            "You or the bot cannot unmute that member because of role hierarchy.",
          ),
        );

      await member.roles.remove(roleId, `${interaction.user.tag}: ${reason}`);
      await prisma.temporaryAction.deleteMany({
        where: { guildId: interaction.guild.id, userId, type: kind },
      });
      const record = await createCase({
        guildId: interaction.guild.id,
        type: name,
        userId,
        moderatorId: interaction.user.id,
        reason,
      });
      await notify(
        member.user,
        interaction.guild,
        `${label} removed`,
        reason,
        record.number,
      );
      await interaction.reply(
        response(
          `Removed ${label} from **${member.user.tag}** · Case **#${record.number}**\nReason: ${reason}`,
        ),
      );
    },
  });
}
