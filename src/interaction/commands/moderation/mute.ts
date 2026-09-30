import { ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import Command from "@/classes/Command";
import { parseDuration, msToHuman } from "@/utils/duration";
import {
  canModerate,
  createCase,
  DEFAULT_REASON,
  notify,
  response,
} from "@/utils/moderation";
export default new Command({
  name: "mute",
  description: "mute a member.",
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
      description: "Duration such as 10m, 1h, or 7d; defaults to 10m.",
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
    const input =
      interaction.getOptionValue(
        "duration",
        ApplicationCommandOptionType.String,
      ) ?? "10m";
    const reason =
      interaction.getOptionValue(
        "reason",
        ApplicationCommandOptionType.String,
      ) ?? DEFAULT_REASON;
    const duration = parseDuration(input);
    if (!duration || duration > 28 * 86_400_000)
      return await interaction.reply(
        response("Enter a duration between 1 second and 28 days.", true),
      );
    const member = await interaction.guild.members.fetch(id).catch(() => null);
    const actor = await interaction.guild.members.fetch(interaction.user.id);
    if (
      !member ||
      id === interaction.user.id ||
      id === interaction.client.user.id
    )
      return await interaction.reply(
        response("That member cannot be timed out.", true),
      );
    if (!canModerate(actor, member) || !member.moderatable)
      return await interaction.reply(
        response(
          "You or the bot cannot mute that member because of role hierarchy.",
          true,
        ),
      );
    const record = await createCase({
      guildId: interaction.guild.id,
      type: "mute",
      userId: id,
      moderatorId: interaction.user.id,
      reason,
      durationMs: duration,
      expiresAt: new Date(Date.now() + duration),
    });
    await notify(
      member.user,
      interaction.guild,
      "timeout",
      reason,
      record.number,
      msToHuman(duration),
    );
    await member.timeout(duration, `${interaction.user.tag}: ${reason}`);
    await interaction.reply(
      response(
        `Muted **${member.user.tag}** for **${msToHuman(duration)}** · Case **#${record.number}**\nReason: ${reason}`,
      ),
    );
  },
});
