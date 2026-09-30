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
  name: "kick",
  description: "Kick a member.",
  ephemeral: true,
  defaultMemberPermissions: PermissionFlagsBits.KickMembers,
  options: [
    {
      name: "user",
      description: "Member to kick.",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: "reason",
      description: "Reason for the kick.",
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
    if (!member)
      return await interaction.reply(
        response("That user is not in this server.", true),
      );
    if (id === interaction.user.id || id === interaction.client.user.id)
      return await interaction.reply(
        response("You cannot kick that user.", true),
      );
    if (!canModerate(actor, member) || !member.kickable)
      return await interaction.reply(
        response(
          "You or the bot cannot kick that member because of role hierarchy.",
          true,
        ),
      );
    const record = await createCase({
      guildId: interaction.guild.id,
      type: "kick",
      userId: id,
      moderatorId: interaction.user.id,
      reason,
    });
    await notify(member.user, interaction.guild, "kick", reason, record.number);
    await member.kick(`${interaction.user.tag}: ${reason}`);
    await interaction.reply(
      response(
        `Kicked **${member.user.tag}** · Case **#${record.number}**\nReason: ${reason}`,
      ),
    );
  },
});
