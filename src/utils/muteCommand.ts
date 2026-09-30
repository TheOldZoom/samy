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
export function muteCommand(kind: "imute" | "rmute") {
  const label = kind === "imute" ? "image mute" : "reaction mute";
  return new Command({
    name: kind,
    description: `Apply an ${label} role to a member.`,
    ephemeral: true,
    defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
    options: [
      {
        name: "user",
        description: "Member to mute.",
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: "duration",
        description: "How long the mute should last, such as 30m or 1d.",
        type: ApplicationCommandOptionType.String,
      },
      {
        name: "reason",
        description: "Reason for the mute.",
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
      const config = await prisma.moderationConfig.findUnique({
        where: { guildId: interaction.guild.id },
      });
      const roleId =
        kind === "imute" ? config?.imageMuteRoleId : config?.reactionMuteRoleId;
      if (!roleId)
        return await interaction.reply(
          response(
            `Configure the ${label} role first with /config ${kind}.`,
            true,
          ),
        );
      const role = await interaction.guild.roles
        .fetch(roleId)
        .catch(() => null);
      const member = await interaction.guild.members
        .fetch(id)
        .catch(() => null);
      const actor = await interaction.guild.members.fetch(interaction.user.id);
      if (
        !role ||
        !member ||
        id === interaction.user.id ||
        !canModerate(actor, member) ||
        !member.manageable
      )
        return await interaction.reply(
          response(
            "That member cannot be muted, or the configured role is unavailable.",
            true,
          ),
        );
      await member.roles.add(role, `${interaction.user.tag}: ${reason}`);
      const expiresAt = durationMs ? new Date(Date.now() + durationMs) : null;
      if (expiresAt)
        await prisma.temporaryAction.upsert({
          where: {
            guildId_userId_type: {
              guildId: interaction.guild.id,
              userId: id,
              type: kind,
            },
          },
          create: {
            guildId: interaction.guild.id,
            userId: id,
            type: kind,
            roleId,
            expiresAt,
          },
          update: { roleId, expiresAt },
        });
      const record = await createCase({
        guildId: interaction.guild.id,
        type: kind,
        userId: id,
        moderatorId: interaction.user.id,
        reason,
        durationMs,
        expiresAt,
      });
      await notify(
        member.user,
        interaction.guild,
        label,
        reason,
        record.number,
        durationMs ? msToHuman(durationMs) : undefined,
      );
      await interaction.reply(
        response(
          `Applied ${label} to **${member.user.tag}**${durationMs ? ` for **${msToHuman(durationMs)}**` : ""} · Case **#${record.number}**\nReason: ${reason}`,
        ),
      );
    },
  });
}
