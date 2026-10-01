import { ApplicationCommandOptionType, escapeMarkdown } from "discord.js";

import Command, { Subcommand } from "@/classes/Command";
import prisma from "@/libs/Prisma";
import { icons } from "@/utils/icons";
import {
  describeTimeDifference,
  formatTimeInZone,
  normalizeTimeZone,
  suggestTimeZones,
} from "@/utils/timezone";
import { Container, Text, v2 } from "@/utils/ui/components";

const timezoneOption = {
  name: "timezone",
  description: "Timezone such as America/New_York",
  type: ApplicationCommandOptionType.String,
  required: true,
  autocomplete: true,
} as const;

async function autocompleteTimezone(
  _client: Parameters<NonNullable<Subcommand["autocomplete"]>>[0],
  interaction: Parameters<NonNullable<Subcommand["autocomplete"]>>[1],
) {
  const focused = interaction.options.getFocused(true);
  await interaction.autocomplete({
    choices: suggestTimeZones(String(focused.value)),
  });
}

function error(message: string) {
  return {
    ...v2(new Container().text(Text(`${icons.Wrong} · ${message}`))),
    ephemeral: true,
  };
}

function parseTimeZone(value: string) {
  try {
    return normalizeTimeZone(value);
  } catch {
    return null;
  }
}

export default new Command({
  name: "timezone",
  description: "Manage and compare timezones",
  everywhere: true,
  ephemeral: true,
  subcommands: [
    new Subcommand({
      name: "set",
      description: "Save your timezone",
      options: [timezoneOption],
      ephemeral: true,
      autocomplete: autocompleteTimezone,
      async execute(_client, interaction) {
        await interaction.defer();
        const timezone = parseTimeZone(
          interaction.getOptionValue(
            "timezone",
            ApplicationCommandOptionType.String,
          )!,
        );
        if (!timezone) {
          await interaction.reply(
            error("Choose a valid timezone from autocomplete."),
          );
          return;
        }

        await prisma.user.upsert({
          where: { id: interaction.user.id },
          create: {
            id: interaction.user.id,
            username: interaction.user.username,
            avatar: interaction.user.avatar,
            timezone,
          },
          update: { timezone },
        });

        await interaction.reply({
          ...v2(
            new Container().text(
              Text(`-# ${icons.clock} · Timezone saved`),
              Text(
                `**${escapeMarkdown(timezone.replaceAll("_", " "))}**\n\`${escapeMarkdown(formatTimeInZone(timezone))}\``,
              ),
            ),
          ),
        });
      },
    }),
    new Subcommand({
      name: "remove",
      description: "Remove your saved timezone",
      ephemeral: true,
      async execute(_client, interaction) {
        await interaction.defer();
        const result = await prisma.user.updateMany({
          where: { id: interaction.user.id, timezone: { not: null } },
          data: { timezone: null },
        });

        await interaction.reply(
          result.count
            ? v2(
                new Container().text(
                  Text(`${icons.Correct} · Your saved timezone was removed.`),
                ),
              )
            : error("You don't have a saved timezone."),
        );
      },
    }),
    new Subcommand({
      name: "view",
      description: "Check the current time in a timezone",
      ephemeral: true,
      options: [
        { ...timezoneOption, required: false },
        {
          name: "user",
          description: "Use this user's saved timezone",
          type: ApplicationCommandOptionType.User,
        },
      ],
      autocomplete: autocompleteTimezone,
      async execute(_client, interaction) {
        await interaction.defer();
        const input = interaction.getOptionValue(
          "timezone",
          ApplicationCommandOptionType.String,
        );
        const userId = interaction.getOptionValue(
          "user",
          ApplicationCommandOptionType.User,
        );
        const ownerId = userId ?? interaction.user.id;
        const stored = input
          ? null
          : await prisma.user.findUnique({
              where: { id: ownerId },
              select: { timezone: true },
            });
        const timezone = input ? parseTimeZone(input) : stored?.timezone;

        if (!timezone) {
          await interaction.reply(
            error(
              input
                ? "Choose a valid timezone from autocomplete."
                : userId
                  ? "That user doesn't have a saved timezone."
                  : "Set your timezone first with `/timezone set`.",
            ),
          );
          return;
        }

        await interaction.reply({
          ...v2(
            new Container().text(
              Text(`-# ${icons.clock} · Current time`),
              Text(
                `**${escapeMarkdown(timezone.replaceAll("_", " "))}**\n\`${escapeMarkdown(formatTimeInZone(timezone))}\``,
              ),
            ),
          ),
          allowedMentions: { parse: [] },
        });
      },
    }),
    new Subcommand({
      name: "compare",
      description: "Compare two timezones",
      ephemeral: true,
      options: [
        { ...timezoneOption, name: "to", description: "Timezone to compare" },
        {
          ...timezoneOption,
          name: "from",
          description: "Starting timezone (defaults to your saved timezone)",
          required: false,
        },
        {
          name: "user",
          description: "Use this user's saved timezone as the starting point",
          type: ApplicationCommandOptionType.User,
        },
      ],
      autocomplete: autocompleteTimezone,
      async execute(_client, interaction) {
        await interaction.defer();
        const to = parseTimeZone(
          interaction.getOptionValue(
            "to",
            ApplicationCommandOptionType.String,
          )!,
        );
        if (!to) {
          await interaction.reply(
            error("Choose a valid `to` timezone from autocomplete."),
          );
          return;
        }
        const fromInput = interaction.getOptionValue(
          "from",
          ApplicationCommandOptionType.String,
        );
        const userId = interaction.getOptionValue(
          "user",
          ApplicationCommandOptionType.User,
        );
        const stored = fromInput
          ? null
          : await prisma.user.findUnique({
              where: { id: userId ?? interaction.user.id },
              select: { timezone: true },
            });
        const from = fromInput ? parseTimeZone(fromInput) : stored?.timezone;

        if (!from) {
          await interaction.reply(
            error(
              fromInput
                ? "Choose a valid `from` timezone from autocomplete."
                : userId
                  ? "That user doesn't have a saved timezone."
                  : "Choose `from` or save your timezone with `/timezone set`.",
            ),
          );
          return;
        }

        const now = new Date();
        await interaction.reply({
          ...v2(
            new Container().text(
              Text(`-# ${icons.clock} · Timezone comparison`),
              Text(
                [
                  `**${escapeMarkdown(from.replaceAll("_", " "))}**\n\`${escapeMarkdown(formatTimeInZone(from, now))}\``,
                  `**${escapeMarkdown(to.replaceAll("_", " "))}**\n\`${escapeMarkdown(formatTimeInZone(to, now))}\``,
                  `-# ${describeTimeDifference(from, to, now)}`,
                ].join("\n"),
              ),
            ),
          ),
          allowedMentions: { parse: [] },
        });
      },
    }),
  ],
});
