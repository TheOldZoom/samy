import { ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import Command from "@/classes/Command";
import {
  canModerate,
  createCase,
  DEFAULT_REASON,
  notify,
  response,
} from "@/utils/moderation";

export default new Command({
  name: "softban",
  description: "Ban then immediately unban a user to delete their messages.",
  ephemeral: true,
  defaultMemberPermissions: PermissionFlagsBits.BanMembers,
  options: [
    {
      name: "user",
      description: "User to softban.",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: "days",
      description: "Days of messages to delete, from 1 to 7 (default 1).",
      type: ApplicationCommandOptionType.Integer,
      min_value: 1,
      max_value: 7,
    },
    {
      name: "reason",
      description: "Reason for the softban.",
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
    const days =
      interaction.getOptionValue(
        "days",
        ApplicationCommandOptionType.Integer,
      ) ?? 1;
    const reason =
      interaction.getOptionValue(
        "reason",
        ApplicationCommandOptionType.String,
      ) ?? DEFAULT_REASON;

    const user = await interaction.client.users.fetch(id).catch(() => null);
    if (!user)
      return await interaction.reply(
        response("I could not find that user.", true),
      );

    if (id === interaction.user.id || id === interaction.client.user.id)
      return await interaction.reply(
        response("You cannot softban that user.", true),
      );

    const existingBan = await interaction.guild.bans
      .fetch({ user: id, force: true })
      .catch(() => null);
    if (existingBan)
      return await interaction.reply(
        response("That user is already banned.", true),
      );

    const member = await interaction.guild.members.fetch(id).catch(() => null);
    if (member) {
      const actor = await interaction.guild.members.fetch(interaction.user.id);
      if (!canModerate(actor, member) || !member.bannable)
        return await interaction.reply(
          response(
            "You or the bot cannot softban that member because of role hierarchy.",
            true,
          ),
        );
    }

    const record = await createCase({
      guildId: interaction.guild.id,
      type: "softban",
      userId: id,
      moderatorId: interaction.user.id,
      reason,
    });

    await notify(user, interaction.guild, "softban", reason, record.number);

    try {
      await interaction.guild.members.ban(id, {
        deleteMessageSeconds: days * 86_400,
        reason: `${interaction.user.tag}: Softban: ${reason}`,
      });
    } catch {
      return await interaction.reply(
        response("I could not ban that user.", true),
      );
    }

    const unbanned = await interaction.guild.members
      .unban(id, `${interaction.user.tag}: Softban complete`)
      .then(() => true)
      .catch(() => false);

    if (!unbanned)
      return await interaction.reply(
        response(
          `Banned **${user.tag}** and deleted **${days}d** of messages, but I could not unban them. Use /unban manually. · Case **#${record.number}**`,
          true,
        ),
      );

    await interaction.reply(
      response(
        `Softbanned **${user.tag}** · deleted **${days}d** of messages · Case **#${record.number}**\nReason: ${reason}`,
      ),
    );
  },
});
