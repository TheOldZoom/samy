import { ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import Command, { Subcommand } from "@/classes/Command";
import prisma from "@/libs/Prisma";
import { renderNotesList } from "@/utils/moderationLists";
import { response } from "@/utils/moderation";
import { v2 } from "@/utils/ui/components";
const user = {
  name: "user",
  description: "Member whose notes to manage.",
  type: ApplicationCommandOptionType.User,
  required: true,
} as const;
export default new Command({
  name: "notes",
  description: "View and manage member notes.",
  ephemeral: true,
  defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
  subcommands: [
    new Subcommand({
      name: "list",
      description: "List member notes.",
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
        await interaction.reply({
          ...v2(
            await renderNotesList(
              interaction.guildId,
              interaction.user.id,
              (interaction.getOptionValue(
                "page",
                ApplicationCommandOptionType.Integer,
              ) ?? 1) - 1,
              u ?? interaction.user.id,
            ),
          ),
          ephemeral: true,
          allowedMentions: { parse: [] },
        });
      },
    }),
    new Subcommand({
      name: "add",
      description: "Add a member note.",
      ephemeral: true,
      options: [
        user,
        {
          name: "content",
          description: "Note content.",
          type: ApplicationCommandOptionType.String,
          required: true,
          max_length: 1000,
        },
      ],
      async execute(_client, interaction) {
        if (!interaction.guildId) return;
        await interaction.defer();

        await prisma.memberNote.create({
          data: {
            guildId: interaction.guildId,
            userId: interaction.getOptionValue(
              "user",
              ApplicationCommandOptionType.User,
            )!,
            authorId: interaction.user.id,
            content: interaction.getOptionValue(
              "content",
              ApplicationCommandOptionType.String,
            )!,
          },
        });
        await interaction.reply(response("Note added.", true));
      },
    }),
    new Subcommand({
      name: "remove",
      description: "Remove a member note.",
      ephemeral: true,
      options: [
        user,
        {
          name: "note-id",
          description: "Full or trailing note ID.",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
      async execute(_client, interaction) {
        if (!interaction.guildId) return;
        await interaction.defer();

        const rows = await prisma.memberNote.findMany({
          where: {
            guildId: interaction.guildId,
            userId: interaction.getOptionValue(
              "user",
              ApplicationCommandOptionType.User,
            )!,
            id: {
              endsWith: interaction.getOptionValue(
                "note-id",
                ApplicationCommandOptionType.String,
              )!,
            },
          },
          take: 2,
        });
        if (rows.length !== 1)
          return await interaction.reply(
            response(
              rows.length ? "That ID is ambiguous." : "Note not found.",
              true,
            ),
          );
        await prisma.memberNote.delete({ where: { id: rows[0]!.id } });
        await interaction.reply(response("Note removed.", true));
      },
    }),
    new Subcommand({
      name: "clear",
      description: "Clear all notes for a member.",
      ephemeral: true,
      options: [user],
      async execute(_client, interaction) {
        if (!interaction.guildId) return;
        await interaction.defer();

        const r = await prisma.memberNote.deleteMany({
          where: {
            guildId: interaction.guildId,
            userId: interaction.getOptionValue(
              "user",
              ApplicationCommandOptionType.User,
            )!,
          },
        });
        await interaction.reply(response(`Removed ${r.count} note(s).`, true));
      },
    }),
  ],
});
