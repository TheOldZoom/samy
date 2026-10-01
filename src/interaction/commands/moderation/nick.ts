import {
  ApplicationCommandOptionType,
  escapeMarkdown,
  PermissionFlagsBits,
} from "discord.js";
import Command from "@/classes/Command";
import prisma from "@/libs/Prisma";
import { canModerate, DEFAULT_REASON, response } from "@/utils/moderation";

export default new Command({
  name: "nick",
  description: "Change or reset a member's nickname.",
  ephemeral: true,
  defaultMemberPermissions: PermissionFlagsBits.ManageNicknames,
  options: [
    {
      name: "user",
      description: "Member whose nickname to change.",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: "nickname",
      description: "New nickname. Leave empty to reset it.",
      type: ApplicationCommandOptionType.String,
      max_length: 32,
    },
    {
      name: "force",
      description: "Keep the nickname locked so the member cannot change it.",
      type: ApplicationCommandOptionType.Boolean,
    },
    {
      name: "reason",
      description: "Reason for the change.",
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
    const nickname =
      interaction
        .getOptionValue("nickname", ApplicationCommandOptionType.String)
        ?.trim() || null;
    const force =
      interaction.getOptionValue(
        "force",
        ApplicationCommandOptionType.Boolean,
      ) ?? false;
    const reason =
      interaction.getOptionValue(
        "reason",
        ApplicationCommandOptionType.String,
      ) ?? DEFAULT_REASON;

    if (force && !nickname)
      return await interaction.reply(
        response("Provide a nickname to force.", true),
      );

    const guildId = interaction.guild.id;
    const member = await interaction.guild.members.fetch(id).catch(() => null);
    const actor = await interaction.guild.members.fetch(interaction.user.id);

    if (!member)
      return await interaction.reply(
        response("That user is not in this server.", true),
      );
    if (id === interaction.user.id || id === interaction.client.user.id)
      return await interaction.reply(
        response("You cannot change that member's nickname here.", true),
      );
    if (!canModerate(actor, member) || !member.manageable)
      return await interaction.reply(
        response(
          "You or the bot cannot change that member's nickname because of role hierarchy.",
          true,
        ),
      );

    const where = { guildId_userId: { guildId, userId: id } };
    const previous = await prisma.forcedNickname.findUnique({ where });

    try {
      if (force && nickname) {
        await prisma.forcedNickname.upsert({
          where,
          create: {
            guildId,
            userId: id,
            nickname,
            moderatorId: interaction.user.id,
          },
          update: { nickname, moderatorId: interaction.user.id },
        });
      } else if (previous) {
        await prisma.forcedNickname.delete({ where });
      }

      await member.setNickname(nickname, `${interaction.user.tag}: ${reason}`);
    } catch {
      if (previous) {
        await prisma.forcedNickname
          .upsert({
            where,
            create: {
              guildId,
              userId: id,
              nickname: previous.nickname,
              moderatorId: previous.moderatorId,
            },
            update: {
              nickname: previous.nickname,
              moderatorId: previous.moderatorId,
            },
          })
          .catch(() => null);
      } else {
        await prisma.forcedNickname
          .deleteMany({ where: { guildId, userId: id } })
          .catch(() => null);
      }

      return await interaction.reply(
        response("I could not change that member's nickname.", true),
      );
    }

    const shown = nickname ? escapeMarkdown(nickname) : null;
    const unlocked =
      previous && !(force && nickname)
        ? "\nThe forced nickname has been removed."
        : "";

    await interaction.reply(
      response(
        (force && shown
          ? `Forced **${member.user.tag}**'s nickname to **${shown}**. Any change they make will be reverted until you run /nick on them again.`
          : shown
            ? `Changed **${member.user.tag}**'s nickname to **${shown}**.`
            : `Reset **${member.user.tag}**'s nickname.`) +
          `\nReason: ${reason}${unlocked}`,
      ),
    );
  },
});
