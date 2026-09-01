import { MessageFlags, type Message } from "discord.js";

import { icons } from "@/utils/icons";

import { MessageCommand } from "@/classes/Command";
import { Container, Text } from "@/ui/components";
import type Client from "@/classes/client";

async function executeReason({
  message,
  client,
  caseNumber,
  reason,
}: {
  message: Message;
  client: Client;
  caseNumber: string;
  reason: string;
}): Promise<void> {
  if (!message.guild) {
    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(icons.edit + " " + client.i18n.t("commands.reason.guild_only")),
        ),
      ],
    });

    return;
  }

  const numericCase = Number(caseNumber);

  if (!Number.isInteger(numericCase)) {
    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(
            icons.edit + " " + client.i18n.t("commands.reason.invalid_case"),
          ),
        ),
      ],
    });

    return;
  }

  const modCase = await client.prisma.moderationCase.findUnique({
    where: {
      guildId_caseNumber: {
        guildId: message.guild.id,
        caseNumber: numericCase,
      },
    },
  });

  if (!modCase) {
    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(
            icons.edit +
              " " +
              client.i18n.t("commands.reason.not_found", {
                case: caseNumber,
              }),
          ),
        ),
      ],
    });

    return;
  }

  try {
    await client.prisma.moderationCase.update({
      where: {
        guildId_caseNumber: {
          guildId: message.guild.id,
          caseNumber: numericCase,
        },
      },
      data: { reason },
    });

    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(
            icons.edit +
              " " +
              client.i18n.t("commands.reason.success", {
                case: String(numericCase),
                reason,
              }),
          ),
        ),
      ],
    });
  } catch {
    await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new Container().text(
          Text(icons.edit + " " + client.i18n.t("commands.reason.failed")),
        ),
      ],
    });
  }
}

export default new MessageCommand({
  name: "reason",
  description: "Edit the reason of a moderation case.",
  aliases: ["editreason", "casereason"],
  category: "Moderation",
  guildOnly: true,
  userPermissions: ["ModerateMembers"],

  arguments: [
    {
      name: "case_number",
      aliases: ["case", "id", "number"],
      type: "string",
      description: "The case number to edit.",
      required: true,
    },
    {
      name: "reason",
      aliases: ["r"],
      type: "string",
      description: "The new reason for the case.",
      required: true,
    },
  ],

  async execute(client, message, args) {
    const caseNumber = args.getString("case_number");
    const reason = args.getString("reason");

    if (!caseNumber) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.edit + " " + client.i18n.t("commands.reason.missing_case"),
            ),
          ),
        ],
      });

      return;
    }

    if (!reason) {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          new Container().text(
            Text(
              icons.edit +
                " " +
                client.i18n.t("commands.reason.missing_reason"),
            ),
          ),
        ],
      });

      return;
    }

    await executeReason({ client, message, caseNumber, reason });
  },
});
