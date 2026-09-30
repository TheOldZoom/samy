import { ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import Command from "@/classes/Command";
import prisma from "@/libs/Prisma";
import { renderCasesList } from "@/utils/moderationLists";
import { response } from "@/utils/moderation";
import { Container, Text, v2 } from "@/utils/ui/components";
import { icons } from "@/utils/icons";
export default new Command({
  name: "cases",
  description: "View moderation cases.",
  defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
  ephemeral: true,
  options: [
    {
      name: "user",
      description: "Filter by user.",
      type: ApplicationCommandOptionType.User,
    },
    {
      name: "case-number",
      description: "Specific case number.",
      type: ApplicationCommandOptionType.Integer,
      min_value: 1,
    },
    {
      name: "page",
      description: "Page number.",
      type: ApplicationCommandOptionType.Integer,
      min_value: 1,
    },
  ],
  async execute(_client, interaction) {
    if (!interaction.guildId) return;
    await interaction.defer();

    const user = interaction.getOptionValue(
      "user",
      ApplicationCommandOptionType.User,
    );
    const number = interaction.getOptionValue(
      "case-number",
      ApplicationCommandOptionType.Integer,
    );
    const page =
      interaction.getOptionValue(
        "page",
        ApplicationCommandOptionType.Integer,
      ) ?? 1;
    if (number) {
      const item = await prisma.moderationCase.findUnique({
        where: { guildId_number: { guildId: interaction.guildId, number } },
      });
      if (!item || (user && item.userId !== user))
        return await interaction.reply(
          response(`Case #${number} was not found.`, true),
        );
      await interaction.reply({
        ...v2(
          new Container().text(
            Text(`-# ${icons.list} · Moderation case`),
            Text(
              `### Case #${item.number}\n**Action:** ${item.type}\n**User:** <@${item.userId}>\n**Moderator:** <@${item.moderatorId}>\n**Reason:** ${item.reason}\n**Created:** <t:${Math.floor(item.createdAt.getTime() / 1000)}:F>`,
            ),
          ),
        ),
        ephemeral: true,
        allowedMentions: { parse: [] },
      });
      return;
    }
    await interaction.reply({
      ...v2(
        await renderCasesList(
          interaction.guildId,
          interaction.user.id,
          page - 1,
          user,
        ),
      ),
      ephemeral: true,
      allowedMentions: { parse: [] },
    });
  },
});
