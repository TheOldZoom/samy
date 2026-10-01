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
  name: "unmute",
  description: "Remove a member's timeout.",
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
    const member = await interaction.guild.members
      .fetch(userId)
      .catch(() => null);
    const actor = await interaction.guild.members.fetch(interaction.user.id);
    if (!member || !member.isCommunicationDisabled())
      return await interaction.reply(response("That member is not muted."));
    if (!canModerate(actor, member) || !member.moderatable)
      return await interaction.reply(
        response(
          "You or the bot cannot unmute that member because of role hierarchy.",
        ),
      );

    await member.timeout(null, `${interaction.user.tag}: ${reason}`);
    const record = await createCase({
      guildId: interaction.guild.id,
      type: "unmute",
      userId,
      moderatorId: interaction.user.id,
      reason,
    });
    await notify(
      member.user,
      interaction.guild,
      "unmute",
      reason,
      record.number,
    );
    await interaction.reply(
      response(
        `Unmuted **${member.user.tag}** · Case **#${record.number}**\nReason: ${reason}`,
      ),
    );
  },
});
