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
  name: "jail",
  description: "Jail a member.",
  ephemeral: true,
  defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
  options: [
    {
      name: "user",
      description: "Member to jail.",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: "duration",
      description: "How long the member should be jailed, such as 10m or 1h.",
      type: ApplicationCommandOptionType.String,
    },
    {
      name: "reason",
      description: "Reason for the jail.",
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
    const durationInput = interaction.getOptionValue(
      "duration",
      ApplicationCommandOptionType.String,
    );
    const reason =
      interaction.getOptionValue(
        "reason",
        ApplicationCommandOptionType.String,
      ) ?? DEFAULT_REASON;
    const durationMs = durationInput ? parseDuration(durationInput) : null;

    if (durationInput && (!durationMs || durationMs < 1_000))
      return await interaction.reply(
        response("Enter a valid duration of at least 1 second.", true),
      );

    const config = await prisma.moderationConfig.findUnique({
      where: { guildId: interaction.guild.id },
    });
    if (!config?.jailRoleId || !config.jailChannelId)
      return await interaction.reply(
        response("Configure the jail role and channel first.", true),
      );

    const member = await interaction.guild.members
      .fetch(userId)
      .catch(() => null);
    const actor = await interaction.guild.members.fetch(interaction.user.id);
    if (
      !member ||
      userId === interaction.user.id ||
      userId === interaction.client.user.id
    )
      return await interaction.reply(
        response("That member cannot be jailed.", true),
      );
    if (!canModerate(actor, member) || !member.manageable)
      return await interaction.reply(
        response(
          "You or the bot cannot jail that member because of role hierarchy.",
          true,
        ),
      );

    const jailRole = await interaction.guild.roles
      .fetch(config.jailRoleId)
      .catch(() => null);
    if (!jailRole)
      return await interaction.reply(
        response("The configured jail role no longer exists.", true),
      );

    const expiresAt = durationMs ? new Date(Date.now() + durationMs) : null;
    await member.roles.add(jailRole, `${interaction.user.tag}: ${reason}`);

    if (expiresAt) {
      await prisma.temporaryAction.upsert({
        where: {
          guildId_userId_type: {
            guildId: interaction.guild.id,
            userId,
            type: "jail",
          },
        },
        create: {
          guildId: interaction.guild.id,
          userId,
          type: "jail",
          roleId: jailRole.id,
          expiresAt,
        },
        update: { roleId: jailRole.id, expiresAt },
      });
    } else {
      await prisma.temporaryAction.deleteMany({
        where: { guildId: interaction.guild.id, userId, type: "jail" },
      });
    }

    const record = await createCase({
      guildId: interaction.guild.id,
      type: "jail",
      userId,
      moderatorId: interaction.user.id,
      reason,
      durationMs,
      expiresAt,
    });
    await notify(
      member.user,
      interaction.guild,
      "jail",
      reason,
      record.number,
      durationMs ? msToHuman(durationMs) : undefined,
    );
    await interaction.reply(
      response(
        `Jailed **${member.user.tag}**${durationMs ? ` for **${msToHuman(durationMs)}**` : ""} · Case **#${record.number}**\nReason: ${reason}`,
      ),
    );
  },
});
