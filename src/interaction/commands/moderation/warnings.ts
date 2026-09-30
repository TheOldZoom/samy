import { ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import Command, { Subcommand } from "@/classes/Command";
import prisma from "@/libs/Prisma";
import { renderWarningsList } from "@/utils/moderationLists";
import { response } from "@/utils/moderation";
import { v2 } from "@/utils/ui/components";
const user = {
  name: "user",
  description: "User whose warnings to manage.",
  type: ApplicationCommandOptionType.User,
  required: true,
} as const;
export default new Command({
  name: "warnings",
  description: "View and manage warnings.",
  ephemeral: true,
  defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
  subcommands: [
    new Subcommand({
      name: "list",
      description: "List warnings.",
      ephemeral: true,
      options: [
        { ...user, required: false },
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

        const u = interaction.getOptionValue(
          "user",
          ApplicationCommandOptionType.User,
        );
        const p =
          interaction.getOptionValue(
            "page",
            ApplicationCommandOptionType.Integer,
          ) ?? 1;
        await interaction.reply({
          ...v2(
            await renderWarningsList(
              interaction.guildId,
              interaction.user.id,
              p - 1,
              u,
            ),
          ),
          ephemeral: true,
          allowedMentions: { parse: [] },
        });
      },
    }),
    new Subcommand({
      name: "remove",
      description: "Remove a warning.",
      ephemeral: true,
      options: [
        user,
        {
          name: "warning-id",
          description: "Full or trailing warning ID.",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
      async execute(_client, interaction) {
        if (!interaction.guildId) return;
        await interaction.defer();

        const u = interaction.getOptionValue(
          "user",
          ApplicationCommandOptionType.User,
        )!;
        const id = interaction.getOptionValue(
          "warning-id",
          ApplicationCommandOptionType.String,
        )!;
        const matches = await prisma.warning.findMany({
          where: {
            guildId: interaction.guildId,
            userId: u,
            id: { endsWith: id },
          },
          take: 2,
        });
        if (matches.length !== 1)
          return await interaction.reply(
            response(
              matches.length ? "That ID is ambiguous." : "Warning not found.",
              true,
            ),
          );
        await prisma.warning.delete({ where: { id: matches[0]!.id } });
        await interaction.reply(response("Warning removed.", true));
      },
    }),
    new Subcommand({
      name: "clear",
      description: "Clear every warning for a user.",
      ephemeral: true,
      options: [user],
      async execute(_client, interaction) {
        if (!interaction.guildId) return;
        await interaction.defer();

        const result = await prisma.warning.deleteMany({
          where: {
            guildId: interaction.guildId,
            userId: interaction.getOptionValue(
              "user",
              ApplicationCommandOptionType.User,
            )!,
          },
        });
        await interaction.reply(
          response(`Removed ${result.count} warning(s).`, true),
        );
      },
    }),
  ],
});
